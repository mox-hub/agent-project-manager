/**
 * SQLite 轻量迁移执行器（CAP-A-14「桌面升级迁移」/ G7-b 缺口兑现）。
 *
 * 背景：打包模式用户机无 prisma CLI（ADR-015 剪除），建库走模板恢复
 * （desktop 壳 setup.ts），升级迁移此前无任何执行路径——新代码 + 旧库
 * 缺列 500（2026-09-21 实锤）。本执行器在 server 启动链（Nest DI 之前）
 * 与工作区库建连前对目标 SQLite 库补齐未应用的迁移。
 *
 * 关键设计（与 prisma migrate deploy 的记账结构逐列对齐，见 LEDGER_DDL）：
 * 1. 读 migrations 目录（时间戳目录名排序）+ 目标库 `_prisma_migrations`
 *    记账（无表 = 空记账）→ 差集逐版本在事务中执行 migration.sql 并写记账行。
 * 2. baseline 检测（模板库记账坑）：模板库由打包机 `db push` 生成（pack.mjs
 *    4b），schema 最新但记账为空；`migrate deploy` 遇到这种库会重放全部历史
 *    迁移而在建表语句上炸掉。因此记账空 + 业务表存在 → 全部历史迁移只标记
 *    不执行。探针加固：baseline 前校验「最新迁移的 DDL 工件」确实存在——
 *    不存在说明库版本落后且历史不可重放（历史含重复建表，实测 migrate deploy
 *    空库 P3018），拒绝静默 baseline，走失败拒绝启动 + 指引恢复路径。
 * 3. 迁移前自动备份：差集非空才备份（幂等重入零成本），VACUUM INTO 快照
 *    到 `.apm-backups/pre-migrate-*`，失败错误携带备份目录供指引恢复。
 * 4. 执行失败抛 SchemaMigrationError（迁移名 + SQL 错误摘要 + 备份目录），
 *    由启动链编排（startup-migrations.ts）决定拒绝启动。
 *
 * 纯函数风格：不依赖 Nest DI / AsyncLocalStorage，对任意 db 路径可用；
 * 短连客户端用完即断，不进数据层连接池。
 */

// 与 prisma.service.ts 同款守卫：先于 @prisma/client 求值，防全局 env 误设 dataproxy
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
import { randomUUID, createHash } from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { createPreMigrateBackup } from './pre-migrate-backup';

/** 迁移目录内合法迁移（时间戳目录 + migration.sql） */
export interface SqliteMigrationToApply {
  /** 目录名（`YYYYMMDDHHMMSS_语义名`，字典序 = 应用序） */
  name: string;
  /** migration.sql 全文 */
  sql: string;
  /** sha256（与 prisma 记账列同源同格式） */
  checksum: string;
}

/** 一次迁移执行的结果（供启动链编排记日志/审计） */
export interface MigrationRunResult {
  /** 目标库标识（default / 工作区 id） */
  dbLabel: string;
  /** up-to-date = 无待应用；applied = 真执行了 SQL；baselined = 模板派生库补记账 */
  action: 'up-to-date' | 'applied' | 'baselined';
  /** 真执行的迁移名（按应用序） */
  applied: string[];
  /** baseline 标记的迁移数（未执行 SQL） */
  baselined: number;
  /** 本次产生的迁移前备份目录（仅真实执行时有） */
  backupDir: string | null;
}

/** 迁移失败结构化错误：迁移名 + SQL 摘要 + 备份目录（指引恢复用） */
export class SchemaMigrationError extends Error {
  readonly dbLabel: string;
  readonly migrationName: string | null;
  readonly backupDir: string | null;

  constructor(init: {
    message: string;
    dbLabel: string;
    migrationName?: string | null;
    backupDir?: string | null;
  }) {
    super(init.message);
    this.name = 'SchemaMigrationError';
    this.dbLabel = init.dbLabel;
    this.migrationName = init.migrationName ?? null;
    this.backupDir = init.backupDir ?? null;
  }
}

/**
 * `_prisma_migrations` 建表 DDL——与 prisma 官方逐列一致（实证取自真实 dev.db
 * 的 sqlite_master DDL），保证 prisma CLI 日后接入（支持场景）零漂移。
 */
const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
)`;

/** baseline 记账行的 logs 标记（排障时区分「真执行」与「模板派生补记账」） */
const BASELINE_LOG =
  'baseline: db push 模板派生库（记账为空），历史迁移标记已应用不执行（CAP-A-14）';

/** baseline 前的当前性探针：校验最新迁移的 DDL 工件确实存在 */
export interface SqliteSchemaProbe {
  migrationName: string;
  table: string;
  /** 非 null = 校验列存在（ALTER TABLE ADD COLUMN）；null = 校验表存在（CREATE TABLE） */
  column: string | null;
}

/** SQL 文本字面量单引号转义（'' 转义，与 backup.service 同义，防路径注入） */
function escapeSqliteTextLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * 读 migrations 目录为有序迁移列表：仅接受 `YYYYMMDDHHMMSS_*` 目录且含
 * migration.sql；目录名字典序即应用序（时间戳前缀保证）。缺 migration.sql
 * 视为运行时资产不完整，显式报错（绝不静默跳过）。
 */
export function readMigrationsDir(
  migrationsDir: string,
): SqliteMigrationToApply[] {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`迁移目录不存在：${migrationsDir}`);
  }
  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
    .map((e) => e.name)
    .sort();
  return entries.map((name) => {
    const file = path.join(migrationsDir, name, 'migration.sql');
    if (!fs.existsSync(file)) {
      throw new Error(
        `迁移 ${name} 缺少 migration.sql（运行时资产不完整）：${file}`,
      );
    }
    const sql = fs.readFileSync(file, 'utf-8');
    return {
      name,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    };
  });
}

/** 片段剥注释后是否还有可执行内容（纯注释/空白片段在拆分时剔除） */
function hasExecutableContent(segment: string): boolean {
  const withoutComments = segment
    .replace(/--[^\n]*/g, '') // 行注释
    .replace(/\/\*[\s\S]*?\*\//g, ''); // 块注释
  return /[\w"']/.test(withoutComments);
}

/**
 * 拆分 migration.sql 为可逐条执行语句：状态机识别行注释 / 块注释 /
 * 单引号字符串（'' 转义）/ 双引号标识符（"" 转义），仅裸 `;` 断句——
 * 字符串内的分号（默认值文本等）不断句。产出剔除纯注释/空白片段。
 * 本仓迁移无触发器（BEGIN..END），状态机覆盖面与资产复杂度匹配。
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let state:
    'default' | 'single' | 'double' | 'line-comment' | 'block-comment' =
    'default';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (state === 'default') {
      if (ch === '-' && next === '-') {
        state = 'line-comment';
        current += ch;
        continue;
      }
      if (ch === '/' && next === '*') {
        state = 'block-comment';
        current += ch;
        continue;
      }
      if (ch === "'") {
        state = 'single';
        current += ch;
        continue;
      }
      if (ch === '"') {
        state = 'double';
        current += ch;
        continue;
      }
      if (ch === ';') {
        statements.push(current);
        current = '';
        continue;
      }
      current += ch;
      continue;
    }
    if (state === 'single' || state === 'double') {
      current += ch;
      const quote = state === 'single' ? "'" : '"';
      if (ch === quote) {
        if (next === quote) {
          current += next;
          i++;
        } else {
          state = 'default';
        }
      }
      continue;
    }
    // 行注释到换行为止；块注释到 */ 为止
    current += ch;
    if (state === 'line-comment' && (ch === '\n' || ch === '\r')) {
      state = 'default';
    } else if (state === 'block-comment' && ch === '*' && next === '/') {
      current += next;
      i++;
      state = 'default';
    }
  }
  statements.push(current);
  return statements.map((s) => s.trim()).filter(hasExecutableContent);
}

/**
 * 从迁移列表推导「当前性探针」：自最新迁移向前找第一个可校验 DDL 工件
 * （ALTER TABLE ADD COLUMN 优先，退而 CREATE TABLE）——baseline 语义是
 * 「全部历史已应用」，任一靠后工件的在场即证明整库处于最新版。
 * 全部不可解析（纯数据迁移等）返回 null，调用方按局限放行（见 baseline 分支）。
 */
export function deriveLatestSchemaProbe(
  migrations: SqliteMigrationToApply[],
): SqliteSchemaProbe | null {
  for (let i = migrations.length - 1; i >= 0; i--) {
    const m = migrations[i];
    const cols = [
      ...m.sql.matchAll(
        /ALTER\s+TABLE\s+"([^"]+)"\s+ADD\s+COLUMN\s+"([^"]+)"/gi,
      ),
    ];
    const col = cols[cols.length - 1];
    if (col) {
      return { migrationName: m.name, table: col[1], column: col[2] };
    }
    const tables = [
      ...m.sql.matchAll(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/gi,
      ),
    ];
    const table = tables[tables.length - 1];
    if (table) {
      return { migrationName: m.name, table: table[1], column: null };
    }
  }
  return null;
}

async function probeSchemaCurrent(
  client: PrismaClient,
  probe: SqliteSchemaProbe,
): Promise<boolean> {
  const table = escapeSqliteTextLiteral(probe.table);
  if (probe.column) {
    const column = escapeSqliteTextLiteral(probe.column);
    const rows = await client.$queryRawUnsafe<Array<{ n: number | bigint }>>(
      `SELECT COUNT(1) AS n FROM pragma_table_info('${table}') WHERE name = '${column}'`,
    );
    return Number(rows[0]?.n ?? 0) > 0;
  }
  const rows = await client.$queryRawUnsafe<Array<{ n: number | bigint }>>(
    `SELECT COUNT(1) AS n FROM "sqlite_master" WHERE type = 'table' AND name = '${table}'`,
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

/** file: URL → 本地路径（dbFileUrl 的逆变换，供备份/错误信息使用；还原平台分隔符） */
export function fileUrlToDbPath(dbUrl: string): string {
  const raw = dbUrl.startsWith('file:') ? dbUrl.slice('file:'.length) : dbUrl;
  return path.sep === '/' ? raw : raw.replace(/\//g, path.sep);
}

async function readAppliedMigrationNames(
  client: PrismaClient,
): Promise<Set<string>> {
  await client.$executeRawUnsafe(LEDGER_DDL);
  const rows = await client.$queryRawUnsafe<Array<{ migration_name: string }>>(
    `SELECT "migration_name" FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL`,
  );
  return new Set(rows.map((r) => r.migration_name));
}

async function countBusinessTables(client: PrismaClient): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ n: number | bigint }>>(
    `
    SELECT COUNT(1) AS n
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_%'
    `,
  );
  return Number(rows[0]?.n ?? 0);
}

/** 单条记账行（与 prisma 官方记账同列；finished=started=now，logs 按需标注） */
async function insertLedgerRow(
  tx: Prisma.TransactionClient,
  migration: SqliteMigrationToApply,
  logs: string | null,
  appliedSteps: number,
): Promise<void> {
  const now = new Date().toISOString();
  await tx.$executeRaw`
    INSERT INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
    VALUES (${randomUUID()}, ${migration.checksum}, ${now}, ${migration.name}, ${logs}, NULL, ${now}, ${appliedSteps})
  `;
}

/**
 * 对单个 SQLite 库执行轻量迁移（幂等）：
 * - 差集空 → up-to-date（零执行零备份，可无限重入）；
 * - 记账空 + 业务表存在 → baseline 分支（探针加固，见文件头注释）；
 * - 其余 → 逐迁移「事务内执行 SQL + 写记账行」，批前先做迁移前快照备份。
 */
export async function migrateSqliteDatabase(opts: {
  /** 目标库 file: URL */
  dbUrl: string;
  /** migrations 目录绝对路径 */
  migrationsDir: string;
  /** 库标识（default / 工作区 id），用于备份目录名与错误信息 */
  dbLabel: string;
}): Promise<MigrationRunResult> {
  const { dbUrl, migrationsDir, dbLabel } = opts;
  const migrations = readMigrationsDir(migrationsDir);
  const dbPath = fileUrlToDbPath(dbUrl);

  if (!fs.existsSync(dbPath)) {
    // 打包链路模板恢复先于 server 启动，文件缺失即现场异常：显式拒绝而非
    // 让 PrismaClient 静默创建空库（空库会走历史重放路径，而历史不可重放）
    throw new SchemaMigrationError({
      message: `目标库文件不存在：${dbPath}（dbLabel=${dbLabel}）`,
      dbLabel,
    });
  }

  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const ledgerNames = await readAppliedMigrationNames(client);
    const pending = migrations.filter((m) => !ledgerNames.has(m.name));

    if (pending.length === 0) {
      return {
        dbLabel,
        action: 'up-to-date',
        applied: [],
        baselined: 0,
        backupDir: null,
      };
    }

    // ---- baseline 分支（模板库记账坑）----
    if (ledgerNames.size === 0 && (await countBusinessTables(client)) > 0) {
      const probe = deriveLatestSchemaProbe(migrations);
      let probeOk = true;
      if (probe) {
        probeOk = await probeSchemaCurrent(client, probe);
      }
      if (!probeOk) {
        // 库版本落后（探针工件缺失）且历史不可重放（含重复建表）：静默
        // baseline 会永远漏掉缺失列，重放必炸——按失败拒绝处理
        throw new SchemaMigrationError({
          message:
            `库「${dbLabel}」schema 落后于迁移历史（探针 ${probe?.table}${probe?.column ? '.' + probe.column : ''} 缺失，` +
            `对应迁移 ${probe?.migrationName}），且迁移历史不可从零重放，无法自动升级。` +
            `请从升级前备份恢复或反馈问题。`,
          dbLabel,
          migrationName: probe?.migrationName ?? null,
        });
      }
      // 探针缺失视为可放行（纯数据迁移目录）：与「记账空 + 库非空 = 模板派生」
      // 的主判定一致，补记账零执行——已知局限，注释明示不静默
      await client.$transaction(
        async (tx) => {
          for (const m of migrations) {
            await insertLedgerRow(tx, m, BASELINE_LOG, 1);
          }
        },
        { maxWait: 10_000, timeout: 30_000 },
      );
      return {
        dbLabel,
        action: 'baselined',
        applied: [],
        baselined: migrations.length,
        backupDir: null,
      };
    }

    // ---- 真实执行分支：批前备份一次（差集非空才产生快照）----
    const backupDir = await createPreMigrateBackup(dbPath, dbLabel);

    for (const migration of pending) {
      const statements = splitSqlStatements(migration.sql);
      try {
        await client.$transaction(
          async (tx) => {
            for (const statement of statements) {
              await tx.$executeRawUnsafe(statement);
            }
            await insertLedgerRow(tx, migration, null, statements.length);
          },
          { maxWait: 10_000, timeout: 60_000 },
        );
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new SchemaMigrationError({
          message:
            `迁移「${migration.name}」在库「${dbLabel}」上执行失败：${reason}。` +
            `已回滚本次变更，迁移前备份：${backupDir}`,
          dbLabel,
          migrationName: migration.name,
          backupDir,
        });
      }
    }

    return {
      dbLabel,
      action: 'applied',
      applied: pending.map((m) => m.name),
      baselined: 0,
      backupDir,
    };
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}
