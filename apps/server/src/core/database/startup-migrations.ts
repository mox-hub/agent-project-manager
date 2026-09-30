/**
 * 打包模式启动链迁移编排（CAP-A-14「桌面升级迁移」）。
 *
 * 插桩点：main.ts bootstrap() 最前、NestFactory.create 之前——迁移必须在
 * PrismaService 建连（DatabaseModule onModuleInit）之前完成，且此时 Nest DI
 * 不可用，故本文件直接消费 process.env、失败直接 process.exit。
 *
 * 范围（多库口径）：default 库（DATABASE_URL）+ 注册表内全部非 default 工作
 * 区库（<path>/data/apm.db，已存在者）。启动期一次性补齐，避免数据层 Proxy
 * 工厂（同步 getClient）无法阻塞等待迁移的竞态；运行期新建工作区源自当版
 * 模板（schema 与代码同版），天然无需迁移，下次启动纳入本编排即可。
 *
 * 判定：APM_PACKAGED=1（desktop 壳 buildServerEnv 仅打包模式注入）。dev 链路
 * schema 对齐维持壳侧 db push（setup.ts alignDevDatabaseSchema），本编排零参与。
 *
 * 失败处置（需求裁决「迁移失败拒绝启动 + 指引恢复」）：
 * - 结构化错误写 stderr（壳侧 pipeLog 落日志）+ 失败标记文件
 *   migration-failure.json（APM_DATA_DIR 下，壳侧弹窗消费后删除）；
 * - 以专用退出码 42 主动退出（区别一般崩溃，壳据此弹「升级迁移失败」指引，
 *   且不做自愈重启——迁移失败是确定性的，重启只会 crash loop）。
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_WORKSPACE_ID,
  dbFileUrl,
  listWorkspaces,
} from './workspace-registry.util';
import {
  MigrationRunResult,
  SchemaMigrationError,
  migrateSqliteDatabase,
} from './schema-migrator';

/** server 迁移失败专用退出码（壳侧 commands.ts 同值约定，勿混用其他语义） */
export const MIGRATION_FAILURE_EXIT_CODE = 42;

/** 壳侧弹窗消费的失败标记文件名（落 APM_DATA_DIR） */
export const MIGRATION_FAILURE_MARKER_FILE = 'migration-failure.json';

export interface MigrationFailureMarker {
  timestamp: string;
  /** 库标识（default / 工作区 id） */
  database: string;
  /** 失败迁移名（baseline 拒绝/库缺失场景可为 null） */
  migrationName: string | null;
  /** 迁移前备份目录（未产生备份时为 null） */
  backupDir: string | null;
  /** 错误摘要（含 SQL 错误） */
  error: string;
  /** 指引文案（与壳侧弹窗正文同源语义） */
  guidance: string;
}

export function isPackagedServer(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.APM_PACKAGED === '1';
}

export function migrationFailureMarkerPath(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env.APM_DATA_DIR
    ? path.join(env.APM_DATA_DIR, MIGRATION_FAILURE_MARKER_FILE)
    : null;
}

/** 启动链迁移入口：打包模式迁移 default + 全部已存在工作区库；失败 exit 42 */
export async function runPackagedStartupMigrations(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (!isPackagedServer(env)) {
    return;
  }
  const migrationsDir =
    env.APM_MIGRATIONS_DIR ??
    path.resolve(process.cwd(), 'prisma', 'migrations');

  const targets: Array<{ dbLabel: string; dbUrl: string }> = [];
  if (!env.DATABASE_URL) {
    failStartup({
      database: 'default',
      migrationName: null,
      backupDir: null,
      error: 'APM_PACKAGED=1 但未配置 DATABASE_URL，无法执行升级迁移',
    });
    return; // 不可达（failStartup 必 exit），类型收窄用
  }
  targets.push({ dbLabel: 'default', dbUrl: env.DATABASE_URL });
  // 注册表为纯 fs 工具（WORKSPACE_REGISTRY_PATH 已由壳注入用户数据目录），
  // 运行时新增工作区源自当版模板无需迁移；此处只补齐已存在的存量库
  for (const ws of listWorkspaces()) {
    if (ws.id === DEFAULT_WORKSPACE_ID || !ws.path) {
      continue;
    }
    const dbPath = path.join(ws.path, 'data', 'apm.db');
    if (fs.existsSync(dbPath)) {
      targets.push({ dbLabel: ws.id, dbUrl: dbFileUrl(dbPath) });
    }
  }

  for (const target of targets) {
    try {
      const result = await migrateSqliteDatabase({
        dbUrl: target.dbUrl,
        migrationsDir,
        dbLabel: target.dbLabel,
      });
      logRunResult(result);
    } catch (err) {
      failStartup({
        database: target.dbLabel,
        migrationName:
          err instanceof SchemaMigrationError ? err.migrationName : null,
        backupDir: err instanceof SchemaMigrationError ? err.backupDir : null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function logRunResult(result: MigrationRunResult): void {
  if (result.action === 'up-to-date') {
    console.log(`[migrate] 库「${result.dbLabel}」schema 已最新，跳过迁移`);
    return;
  }
  if (result.action === 'baselined') {
    console.log(
      `[migrate] 库「${result.dbLabel}」为模板派生库（记账为空），已 baseline 标记 ` +
        `${result.baselined} 个历史迁移为已应用（未执行 SQL）`,
    );
    return;
  }
  console.log(
    `[migrate] 库「${result.dbLabel}」已应用 ${result.applied.length} 个迁移：` +
      `${result.applied.join(', ')}（迁移前备份：${result.backupDir}）`,
  );
}

/** 结构化失败：stderr 明细 + 失败标记文件 + 退出码 42（见文件头「失败处置」） */
function failStartup(init: {
  database: string;
  migrationName: string | null;
  backupDir: string | null;
  error: string;
}): never {
  const marker: MigrationFailureMarker = {
    timestamp: new Date().toISOString(),
    database: init.database,
    migrationName: init.migrationName,
    backupDir: init.backupDir,
    error: init.error,
    guidance:
      '可从设置页「备份与恢复」恢复升级前备份（或将备份目录中的库快照手动覆盖回数据目录），' +
      '或到 GitHub 提 issue 并附日志。',
  };

  const markerPath = migrationFailureMarkerPath();
  if (markerPath) {
    try {
      fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf-8');
    } catch (e) {
      console.error(
        `[migrate] 写迁移失败标记文件失败：${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.error(
    [
      '[migrate] ====== 升级迁移失败，拒绝启动 ======',
      `数据库：${marker.database}`,
      marker.migrationName ? `失败迁移：${marker.migrationName}` : null,
      marker.backupDir
        ? `迁移前备份：${marker.backupDir}`
        : '迁移前备份：无（本次未修改数据库）',
      `错误：${marker.error}`,
      `出路：${marker.guidance}`,
      `失败标记：${markerPath ?? '未写入（APM_DATA_DIR 未配置）'}`,
      '==============================================',
    ]
      .filter((line): line is string => line !== null)
      .join('\n'),
  );
  process.exit(MIGRATION_FAILURE_EXIT_CODE);
}
