/**
 * 轻量迁移执行器单测（CAP-A-14）：临时目录真 SQLite，不依赖 ALS / Nest DI。
 *
 * 场景覆盖：
 * 1. 全新空库应用全部迁移并完整记账；
 * 2. 旧 schema 库（缺最新列）增量应用新迁移，迁移前备份产生；
 * 3. baseline：模板派生库（业务表在、记账空）全标 applied 零执行；
 * 4. 已最新库幂等：差集空 → 零执行零备份；
 * 5. 失败：坏 SQL 迁移 → 抛错含迁移名 + 备份目录已产生 + 事务回滚；
 * 6. 任意 db 路径独立迁移（多库能力）；
 * 7. baseline 探针失败（库版本落后）拒绝静默补记账；
 * 8. SQL 拆分器与探针派生的纯函数行为；
 * 9. 真仓 migrations 目录拆分不丢内容（资产级回归）。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { dbFileUrl } from './workspace-registry.util';
import {
  SchemaMigrationError,
  deriveLatestSchemaProbe,
  fileUrlToDbPath,
  migrateSqliteDatabase,
  readMigrationsDir,
  splitSqlStatements,
} from './schema-migrator';
import { resolvePreMigrateBackupRoot } from './pre-migrate-backup';

// 合成迁移集：覆盖 CREATE TABLE 与 ALTER TABLE ADD COLUMN 两种探针工件
const MIG_1 = '20260101000000_create_item';
const MIG_2 = '20260102000000_item_note';
const SQL_1 = `-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT
);`;
const SQL_2 = `-- AlterTable
ALTER TABLE "Item" ADD COLUMN "note" TEXT;`;

async function withClient<T>(
  dbPath: string,
  fn: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  const client = new PrismaClient({
    datasources: { db: { url: dbFileUrl(dbPath) } },
  });
  try {
    return await fn(client);
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}

async function columnExists(
  dbPath: string,
  table: string,
  column: string,
): Promise<boolean> {
  return withClient(dbPath, async (c) => {
    const rows = await c.$queryRawUnsafe<Array<{ n: number | bigint }>>(
      `SELECT COUNT(1) AS n FROM pragma_table_info('${table}') WHERE name = '${column}'`,
    );
    return Number(rows[0]?.n ?? 0) > 0;
  });
}

async function ledgerNames(dbPath: string): Promise<string[]> {
  return withClient(dbPath, async (c) => {
    const rows = await c.$queryRawUnsafe<Array<{ migration_name: string }>>(
      `SELECT "migration_name" FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL ORDER BY "migration_name"`,
    );
    return rows.map((r) => r.migration_name);
  });
}

describe('schema-migrator（CAP-A-14 桌面升级迁移）', () => {
  let tmpRoot: string;
  let migrationsDir: string;
  let backupRoot: string;
  let previousBackupDir: string | undefined;
  let previousDataDir: string | undefined;

  const writeMigrations = (
    defs: Array<{ name: string; sql: string }>,
  ): void => {
    for (const def of defs) {
      const dir = path.join(migrationsDir, def.name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'migration.sql'), def.sql, 'utf-8');
    }
    // migration_lock.toml 混入目录（真仓形态），执行器必须无视非时间戳条目
    fs.writeFileSync(
      path.join(migrationsDir, 'migration_lock.toml'),
      'provider = "sqlite"\n',
    );
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-migrator-test-'));
    migrationsDir = path.join(tmpRoot, 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });
    backupRoot = path.join(tmpRoot, 'backup-root');
    previousBackupDir = process.env.WORKSPACE_BACKUP_DIR;
    previousDataDir = process.env.APM_DATA_DIR;
    process.env.WORKSPACE_BACKUP_DIR = backupRoot;
    delete process.env.APM_DATA_DIR;
  });

  afterEach(() => {
    if (previousBackupDir === undefined)
      delete process.env.WORKSPACE_BACKUP_DIR;
    else process.env.WORKSPACE_BACKUP_DIR = previousBackupDir;
    if (previousDataDir === undefined) delete process.env.APM_DATA_DIR;
    else process.env.APM_DATA_DIR = previousDataDir;
    fs.rmSync(tmpRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  });

  const preMigrateDirs = (): string[] =>
    fs.existsSync(backupRoot)
      ? fs.readdirSync(backupRoot).filter((n) => n.startsWith('pre-migrate-'))
      : [];

  it('全新空库：应用全部迁移并完整记账', async () => {
    writeMigrations([
      { name: MIG_1, sql: SQL_1 },
      { name: MIG_2, sql: SQL_2 },
    ]);
    const dbPath = path.join(tmpRoot, 'fresh.db');
    fs.writeFileSync(dbPath, ''); // 0 字节 = 合法空 SQLite 库

    const result = await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbPath),
      migrationsDir,
      dbLabel: 'default',
    });

    expect(result.action).toBe('applied');
    expect(result.applied).toEqual([MIG_1, MIG_2]);
    expect(preMigrateDirs().length).toBe(1);
    expect(result.backupDir).toBe(path.join(backupRoot, preMigrateDirs()[0]));
    expect(await columnExists(dbPath, 'Item', 'note')).toBe(true);
    expect(await ledgerNames(dbPath)).toEqual([MIG_1, MIG_2]);
  }, 30_000);

  it('旧 schema 库：增量应用缺的迁移，迁移前备份与记账齐备', async () => {
    // 第一轮：只到 m1（模拟旧版本）
    writeMigrations([{ name: MIG_1, sql: SQL_1 }]);
    const dbPath = path.join(tmpRoot, 'upgrade.db');
    fs.writeFileSync(dbPath, '');
    await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbPath),
      migrationsDir,
      dbLabel: 'ws-a',
    });
    await withClient(dbPath, async (c) => {
      await c.$executeRawUnsafe(
        `INSERT INTO "Item" ("id", "name") VALUES ('i1', '旧数据')`,
      );
    });
    expect(preMigrateDirs().length).toBe(1);

    // 第二轮：新增 m2（新版本发布），旧库原地升级
    writeMigrations([{ name: MIG_2, sql: SQL_2 }]);
    const result = await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbPath),
      migrationsDir,
      dbLabel: 'ws-a',
    });

    expect(result.action).toBe('applied');
    expect(result.applied).toEqual([MIG_2]);
    expect(await columnExists(dbPath, 'Item', 'note')).toBe(true);
    expect(await ledgerNames(dbPath)).toEqual([MIG_1, MIG_2]);
    // 旧数据保留 + 迁移前快照已产生（含 meta.json）
    const rows = await withClient(dbPath, async (c) =>
      c.$queryRawUnsafe<Array<{ n: number | bigint }>>(
        `SELECT COUNT(1) AS n FROM "Item"`,
      ),
    );
    expect(Number(rows[0]?.n ?? 0)).toBe(1);
    const dirs = preMigrateDirs();
    expect(dirs.length).toBe(2);
    expect(fs.existsSync(path.join(backupRoot, dirs[1], 'meta.json'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(backupRoot, dirs[1], 'ws-a.db'))).toBe(true);
    const meta = JSON.parse(
      fs.readFileSync(path.join(backupRoot, dirs[1], 'meta.json'), 'utf-8'),
    ) as { reason: string; sourceDbLabel: string };
    expect(meta.reason).toBe('pre-migrate');
    expect(meta.sourceDbLabel).toBe('ws-a');
  }, 30_000);

  it('baseline：业务表在、记账空（模板派生）→ 全部标记已应用零执行', async () => {
    writeMigrations([
      { name: MIG_1, sql: SQL_1 },
      { name: MIG_2, sql: SQL_2 },
    ]);
    const dbPath = path.join(tmpRoot, 'template-derived.db');
    fs.writeFileSync(dbPath, '');
    // 手工造「db push 模板」形态：schema 最新（含 m2 工件）但无任何记账
    await withClient(dbPath, async (c) => {
      await c.$executeRawUnsafe(
        `CREATE TABLE "Item" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT, "note" TEXT)`,
      );
      await c.$executeRawUnsafe(
        `INSERT INTO "Item" ("id", "name", "note") VALUES ('t1', '模板', '已有')`,
      );
    });

    const result = await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbPath),
      migrationsDir,
      dbLabel: 'default',
    });

    expect(result.action).toBe('baselined');
    expect(result.applied).toEqual([]);
    expect(result.baselined).toBe(2);
    expect(result.backupDir).toBeNull(); // 零执行 → 不产生迁移前备份
    expect(await ledgerNames(dbPath)).toEqual([MIG_1, MIG_2]);
    const rows = await withClient(dbPath, async (c) =>
      c.$queryRawUnsafe<Array<{ n: number | bigint }>>(
        `SELECT COUNT(1) AS n FROM "Item"`,
      ),
    );
    expect(Number(rows[0]?.n ?? 0)).toBe(1); // 数据原样保留
  }, 30_000);

  it('已最新库：差集空 → 零执行零备份（幂等重入）', async () => {
    writeMigrations([
      { name: MIG_1, sql: SQL_1 },
      { name: MIG_2, sql: SQL_2 },
    ]);
    const dbPath = path.join(tmpRoot, 'latest.db');
    fs.writeFileSync(dbPath, '');
    await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbPath),
      migrationsDir,
      dbLabel: 'default',
    });
    const dirsAfterFirst = preMigrateDirs().length;
    expect(dirsAfterFirst).toBe(1);

    for (let round = 0; round < 2; round++) {
      const result = await migrateSqliteDatabase({
        dbUrl: dbFileUrl(dbPath),
        migrationsDir,
        dbLabel: 'default',
      });
      expect(result.action).toBe('up-to-date');
      expect(result.applied).toEqual([]);
      expect(result.backupDir).toBeNull();
    }
    expect(preMigrateDirs().length).toBe(dirsAfterFirst); // 幂等重入零新备份
  }, 30_000);

  it('失败场景：坏 SQL 迁移抛结构化错误，备份已产生且事务回滚', async () => {
    const MIG_3 = '20260103000000_broken';
    writeMigrations([
      { name: MIG_1, sql: SQL_1 },
      { name: MIG_2, sql: SQL_2 },
    ]);
    const dbPath = path.join(tmpRoot, 'broken.db');
    fs.writeFileSync(dbPath, '');
    // 先应用到 m2（好迁移），再补入坏迁移 m3 触发失败
    await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbPath),
      migrationsDir,
      dbLabel: 'default',
    });
    expect(await ledgerNames(dbPath)).toEqual([MIG_1, MIG_2]);
    writeMigrations([
      {
        name: MIG_3,
        sql: `-- 故意坏 SQL：引用不存在的表\nDROP TABLE "Ghost_Table";`,
      },
    ]);

    expect.hasAssertions();
    try {
      await migrateSqliteDatabase({
        dbUrl: dbFileUrl(dbPath),
        migrationsDir,
        dbLabel: 'default',
      });
      throw new Error('应当抛出 SchemaMigrationError');
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaMigrationError);
      const migrationError = err as SchemaMigrationError;
      expect(migrationError.migrationName).toBe(MIG_3);
      expect(migrationError.message).toContain(MIG_3);
      expect(migrationError.backupDir).toBeTruthy();
      expect(fs.existsSync(migrationError.backupDir as string)).toBe(true);
      expect(fs.readdirSync(migrationError.backupDir as string)).toContain(
        'default.db',
      );
      // 事务回滚：m3 记账行不存在，m2 的变更仍在
      expect(await ledgerNames(dbPath)).toEqual([MIG_1, MIG_2]);
      expect(await columnExists(dbPath, 'Item', 'note')).toBe(true);
    }
  }, 30_000);

  it('任意 db 路径独立迁移（不依赖 ALS / 默认库）', async () => {
    writeMigrations([
      { name: MIG_1, sql: SQL_1 },
      { name: MIG_2, sql: SQL_2 },
    ]);
    const dbA = path.join(tmpRoot, 'nested-a', 'data', 'apm.db');
    const dbB = path.join(tmpRoot, 'nested-b', 'data', 'apm.db');
    fs.mkdirSync(path.dirname(dbA), { recursive: true });
    fs.mkdirSync(path.dirname(dbB), { recursive: true });
    fs.writeFileSync(dbA, '');
    fs.writeFileSync(dbB, '');

    const resultB = await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbB),
      migrationsDir,
      dbLabel: 'ws-b',
    });
    expect(resultB.action).toBe('applied');
    expect(await ledgerNames(dbB)).toEqual([MIG_1, MIG_2]);
    expect(await columnExists(dbB, 'Item', 'note')).toBe(true);

    const resultA = await migrateSqliteDatabase({
      dbUrl: dbFileUrl(dbA),
      migrationsDir,
      dbLabel: 'ws-a',
    });
    expect(resultA.action).toBe('applied');
    expect(await ledgerNames(dbA)).toEqual([MIG_1, MIG_2]);
    // 互不串扰：A 的迁移不改变 B 的记账
    expect(await ledgerNames(dbB)).toEqual([MIG_1, MIG_2]);
  }, 30_000);

  it('baseline 探针失败：库版本落后且无记账 → 拒绝静默补记账', async () => {
    writeMigrations([
      { name: MIG_1, sql: SQL_1 },
      { name: MIG_2, sql: SQL_2 },
    ]);
    const dbPath = path.join(tmpRoot, 'stale.db');
    fs.writeFileSync(dbPath, '');
    // 手工造「旧模板」形态：业务表在，但缺最新迁移的工件（note 列）
    await withClient(dbPath, async (c) => {
      await c.$executeRawUnsafe(
        `CREATE TABLE "Item" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT)`,
      );
    });

    await expect(
      migrateSqliteDatabase({
        dbUrl: dbFileUrl(dbPath),
        migrationsDir,
        dbLabel: 'default',
      }),
    ).rejects.toThrow(/schema 落后/);
    // 未被静默 baseline：记账保持为空
    expect(await ledgerNames(dbPath)).toEqual([]);
  }, 30_000);

  it('目标库文件不存在：结构化拒绝而非静默建库', async () => {
    writeMigrations([{ name: MIG_1, sql: SQL_1 }]);
    const dbPath = path.join(tmpRoot, 'missing.db');
    await expect(
      migrateSqliteDatabase({
        dbUrl: dbFileUrl(dbPath),
        migrationsDir,
        dbLabel: 'default',
      }),
    ).rejects.toThrow(/目标库文件不存在/);
    expect(fs.existsSync(dbPath)).toBe(false);
  }, 30_000);
});

describe('splitSqlStatements / deriveLatestSchemaProbe / 资产回归', () => {
  it('拆分器：注释、字符串内分号、双引号标识符不断句', () => {
    const sql = [
      '-- 行注释; 里面有分号也不算',
      '/* 块注释 ; */',
      `CREATE TABLE "Weird;Name" ("v" TEXT DEFAULT 'a;b''c');`,
      `ALTER TABLE "T" ADD COLUMN "x" TEXT; -- 尾注释`,
    ].join('\n');
    const statements = splitSqlStatements(sql);
    expect(statements.length).toBe(2);
    expect(statements[0]).toContain('"Weird;Name"');
    expect(statements[0]).toContain("'a;b''c'");
    expect(statements[1]).toContain('ADD COLUMN');
  });

  it('探针派生：ALTER 优先、退 CREATE、全不可解析为 null', () => {
    const alter = deriveLatestSchemaProbe([
      { name: MIG_1, sql: SQL_1, checksum: 'x' },
      { name: MIG_2, sql: SQL_2, checksum: 'y' },
    ]);
    expect(alter).toEqual({
      migrationName: MIG_2,
      table: 'Item',
      column: 'note',
    });

    const createOnly = deriveLatestSchemaProbe([
      { name: 'm0', sql: 'INSERT INTO "T" DEFAULT VALUES;', checksum: 'z' },
      { name: MIG_1, sql: SQL_1, checksum: 'x' },
    ]);
    expect(createOnly).toEqual({
      migrationName: MIG_1,
      table: 'Item',
      column: null,
    });

    expect(
      deriveLatestSchemaProbe([
        { name: 'm0', sql: 'INSERT INTO "T" DEFAULT VALUES;', checksum: 'z' },
      ]),
    ).toBeNull();
  });

  it('真仓 migrations 目录：全部可读、可拆分且拆分不丢内容', () => {
    const repoMigrationsDir = path.resolve(
      process.cwd(),
      'prisma',
      'migrations',
    );
    const migrations = readMigrationsDir(repoMigrationsDir);
    expect(migrations.length).toBeGreaterThan(40);
    // 拆分保真：剔除注释与空白后，重拼接与原文逐字一致（防拆分器吞语句）
    const normalize = (s: string) =>
      s
        .replace(/--[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, '');
    for (const m of migrations) {
      const statements = splitSqlStatements(m.sql);
      expect(statements.length).toBeGreaterThan(0);
      // 文件尾分号被拆分器归并为语句边界：对比时对原文剥单个尾分号
      const normalizedOriginal = normalize(m.sql).replace(/;$/, '');
      expect(normalize(statements.join(';\n'))).toBe(normalizedOriginal);
    }
  });

  it('fileUrlToDbPath：file: URL 与裸路径均可还原', () => {
    const p = path.join('C:' + path.sep, 'data', 'apm.db');
    expect(fileUrlToDbPath(dbFileUrl(p))).toBe(p);
    expect(fileUrlToDbPath(p)).toBe(p);
  });

  it('备份根目录：APM_DATA_DIR 优先于 cwd，WORKSPACE_BACKUP_DIR 最高', () => {
    const prevBackup = process.env.WORKSPACE_BACKUP_DIR;
    const prevData = process.env.APM_DATA_DIR;
    try {
      delete process.env.WORKSPACE_BACKUP_DIR;
      process.env.APM_DATA_DIR = path.join('X:', 'data');
      expect(resolvePreMigrateBackupRoot()).toBe(
        path.resolve('X:' + path.sep + 'data', '.apm-backups'),
      );
      process.env.WORKSPACE_BACKUP_DIR = path.join('Y:', 'bk');
      expect(resolvePreMigrateBackupRoot()).toBe(
        path.resolve('Y:' + path.sep + 'bk'),
      );
    } finally {
      if (prevBackup === undefined) delete process.env.WORKSPACE_BACKUP_DIR;
      else process.env.WORKSPACE_BACKUP_DIR = prevBackup;
      if (prevData === undefined) delete process.env.APM_DATA_DIR;
      else process.env.APM_DATA_DIR = prevData;
    }
  });
});
