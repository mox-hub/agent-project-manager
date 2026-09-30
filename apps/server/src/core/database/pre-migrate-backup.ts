/**
 * 迁移前轻量快照（CAP-A-14「桌面升级迁移」）。
 *
 * 为什么不复用 WorkspaceBackupService：升级迁移跑在 Nest bootstrap 之前
 * （启动链要求 DI 未就绪即可执行、失败即拒启），注入依赖 PrismaService /
 * LoggerService 的服务会产生启动顺序地狱——故抽纯 fs + 短连 PrismaClient 的
 * 轻量工具，快照语义与备份服务一致（VACUUM INTO 在线快照）。
 *
 * 与设置页「备份与恢复」的关系（有意差异）：
 * - 目录名 pre-migrate-* 前缀：listBackups 只认 backup-*，故迁移前快照不出现在
 *   设置页备份列表，仅出现在迁移失败错误/指引信息中，供恢复或取证；
 * - 不参与 10 份滚动：pruneOldBackups 只删 backup-*。每库每次「真执行迁移」
 *   至多产生一份（幂等重入零产生），体量随升级频次线性增长，可控；纳入滚动
 *   保留策略留给后续切片。
 * - 落点：WORKSPACE_BACKUP_DIR 优先（与备份服务同根，测试可注入）；缺省时
 *   落 APM_DATA_DIR/.apm-backups——打包模式 cwd 在安装目录（resources）内
 *   不可写，必须落用户数据目录。因此与备份服务缺省根（cwd/.apm-backups）
 *   不同，属启动链时序的必然取舍，路径始终在错误信息中显式给出。
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { dbFileUrl } from './workspace-registry.util';

/** VACUUM INTO / SQL 文本字面量的单引号转义（'' 表示一个单引号；与 backup.service 同义） */
function escapeSqliteTextLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/** 迁移前快照根目录（环境变量优先，打包落用户数据目录，见文件头注释） */
export function resolvePreMigrateBackupRoot(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.WORKSPACE_BACKUP_DIR) {
    return path.resolve(env.WORKSPACE_BACKUP_DIR);
  }
  const base = env.APM_DATA_DIR ?? process.cwd();
  return path.resolve(base, '.apm-backups');
}

/**
 * 对指定库文件做 VACUUM INTO 快照，返回备份目录绝对路径。
 * 目录名：pre-migrate-<时间戳>-<库标识>；随附 meta.json 自述来源。
 * 目标库必须在磁盘上存在（执行器已先行校验），运行态（含 -wal）亦安全——
 * VACUUM INTO 读到的是已提交一致性状态。
 */
export async function createPreMigrateBackup(
  dbPath: string,
  dbLabel: string,
): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  // 库标识进文件名：白名单外（注册表可含任意 id）一律收敛为 db，防路径意外
  const safeLabel = /^[A-Za-z0-9._-]+$/.test(dbLabel) ? dbLabel : 'db';
  const root = resolvePreMigrateBackupRoot();
  const base = `pre-migrate-${stamp}-${safeLabel}`;
  let dir = path.join(root, base);
  let seq = 1;
  while (fs.existsSync(dir)) {
    dir = path.join(root, `${base}-${seq}`);
    seq += 1;
  }
  fs.mkdirSync(dir, { recursive: true });

  const snapshotPath = path.join(dir, `${safeLabel}.db`);
  fs.rmSync(snapshotPath, { force: true }); // VACUUM INTO 要求目标不存在（防御性）
  const escaped = escapeSqliteTextLiteral(snapshotPath);
  // 用完即断：快照客户端不进任何连接池，避免长占文件句柄
  const client = new PrismaClient({
    datasources: { db: { url: dbFileUrl(dbPath) } },
  });
  try {
    await client.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);
  } finally {
    await client.$disconnect().catch(() => undefined);
  }

  const sizeBytes = fs.statSync(snapshotPath).size;
  fs.writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify(
      {
        id: path.basename(dir),
        createdAt: new Date().toISOString(),
        reason: 'pre-migrate',
        generator: 'schema-migrator (CAP-A-14)',
        sourceDbPath: dbPath,
        sourceDbLabel: dbLabel,
        files: [
          { name: path.basename(snapshotPath), sizeBytes, kind: 'database' },
        ],
        totalBytes: sizeBytes,
      },
      null,
      2,
    ),
    'utf-8',
  );
  return dir;
}
