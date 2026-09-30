/**
 * 打包模式启动链迁移编排单测（CAP-A-14）：环境门控 / 多库目标发现 /
 * 失败标记文件与专用退出码。真 SQLite + 临时目录，process.exit 以 spy 接管。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { dbFileUrl } from './workspace-registry.util';
import {
  MIGRATION_FAILURE_EXIT_CODE,
  MIGRATION_FAILURE_MARKER_FILE,
  isPackagedServer,
  runPackagedStartupMigrations,
} from './startup-migrations';

const SQL_1 = `CREATE TABLE "Item" ("id" TEXT NOT NULL PRIMARY KEY);`;

async function ledgerHas(dbPath: string, name: string): Promise<boolean> {
  const client = new PrismaClient({
    datasources: { db: { url: dbFileUrl(dbPath) } },
  });
  try {
    // 库从未被迁移执行器触碰时记账表不存在：视为「未记账」而非报错
    const tables = await client.$queryRawUnsafe<Array<{ n: number | bigint }>>(
      `SELECT COUNT(1) AS n FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'`,
    );
    if (Number(tables[0]?.n ?? 0) === 0) {
      return false;
    }
    const rows = await client.$queryRawUnsafe<
      Array<{ migration_name: string }>
    >(`SELECT "migration_name" FROM "_prisma_migrations"`);
    return rows.some((r) => r.migration_name === name);
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}

describe('startup-migrations（打包模式启动链编排）', () => {
  let tmpRoot: string;
  let migrationsDir: string;
  let envBackup: Record<string, string | undefined>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const managedEnv = [
    'APM_PACKAGED',
    'APM_DATA_DIR',
    'APM_MIGRATIONS_DIR',
    'DATABASE_URL',
    'WORKSPACE_REGISTRY_PATH',
    'WORKSPACE_BACKUP_DIR',
  ];

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-startup-mig-test-'));
    migrationsDir = path.join(tmpRoot, 'migrations');
    fs.mkdirSync(path.join(migrationsDir, '20260101000000_create_item'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(migrationsDir, '20260101000000_create_item', 'migration.sql'),
      SQL_1,
      'utf-8',
    );
    envBackup = {};
    for (const key of managedEnv) {
      envBackup[key] = process.env[key];
    }
    process.env.APM_MIGRATIONS_DIR = migrationsDir;
    process.env.WORKSPACE_BACKUP_DIR = path.join(tmpRoot, 'bk');
    process.env.APM_DATA_DIR = path.join(tmpRoot, 'data-dir');
    fs.mkdirSync(process.env.APM_DATA_DIR, { recursive: true });
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`); // 接管退出：让调用栈抛回测试断言
    }) as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    for (const key of managedEnv) {
      if (envBackup[key] === undefined) delete process.env[key];
      else process.env[key] = envBackup[key];
    }
    fs.rmSync(tmpRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  });

  it('isPackagedServer：仅 APM_PACKAGED=1 判定打包', () => {
    delete process.env.APM_PACKAGED;
    expect(isPackagedServer()).toBe(false);
    process.env.APM_PACKAGED = '0';
    expect(isPackagedServer()).toBe(false);
    process.env.APM_PACKAGED = '1';
    expect(isPackagedServer()).toBe(true);
  });

  it('非打包模式零参与：不触碰任何库与文件', async () => {
    delete process.env.APM_PACKAGED;
    const dbPath = path.join(tmpRoot, 'db', 'apm.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, '');
    await runPackagedStartupMigrations();
    expect(await ledgerHas(dbPath, '20260101000000_create_item')).toBe(false);
  });

  it('打包模式：default 库与注册表工作区库都被迁移', async () => {
    process.env.APM_PACKAGED = '1';
    const defaultDb = path.join(tmpRoot, 'db', 'default.db');
    const wsDb = path.join(tmpRoot, 'ws-x', 'data', 'apm.db');
    fs.mkdirSync(path.dirname(defaultDb), { recursive: true });
    fs.mkdirSync(path.dirname(wsDb), { recursive: true });
    fs.writeFileSync(defaultDb, '');
    fs.writeFileSync(wsDb, '');
    // 手写注册表（listWorkspaces 信任该文件；缺 default 条目会被自动补齐）
    process.env.WORKSPACE_REGISTRY_PATH = path.join(tmpRoot, 'workspaces.json');
    fs.writeFileSync(
      process.env.WORKSPACE_REGISTRY_PATH,
      JSON.stringify([
        {
          id: 'default',
          name: '默认工作区',
          path: null,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ws-x',
          name: '工作区X',
          path: path.join(tmpRoot, 'ws-x'),
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
      'utf-8',
    );
    process.env.DATABASE_URL = dbFileUrl(defaultDb);

    await runPackagedStartupMigrations();

    expect(await ledgerHas(defaultDb, '20260101000000_create_item')).toBe(true);
    expect(await ledgerHas(wsDb, '20260101000000_create_item')).toBe(true);
    // 库文件缺失的工作区（注册表登记未建库）不炸编排
    fs.writeFileSync(
      process.env.WORKSPACE_REGISTRY_PATH,
      JSON.stringify([
        {
          id: 'default',
          name: '默认工作区',
          path: null,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ws-x',
          name: '工作区X',
          path: path.join(tmpRoot, 'ws-x'),
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ws-empty',
          name: '未建库',
          path: path.join(tmpRoot, 'ws-empty'),
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
      'utf-8',
    );
    await runPackagedStartupMigrations(); // 幂等重入 + 缺库工作区跳过，不抛
  });

  it('迁移失败：写失败标记 + 以专用退出码 42 拒启', async () => {
    process.env.APM_PACKAGED = '1';
    const defaultDb = path.join(tmpRoot, 'db', 'default.db');
    fs.mkdirSync(path.dirname(defaultDb), { recursive: true });
    fs.writeFileSync(defaultDb, '');
    process.env.DATABASE_URL = dbFileUrl(defaultDb);
    // 坏迁移：目标表不存在 → 执行失败
    fs.writeFileSync(
      path.join(migrationsDir, '20260101000000_create_item', 'migration.sql'),
      'DROP TABLE "Ghost_Table";',
      'utf-8',
    );

    await expect(runPackagedStartupMigrations()).rejects.toThrow(
      `process.exit(${MIGRATION_FAILURE_EXIT_CODE})`,
    );

    const markerPath = path.join(
      process.env.APM_DATA_DIR as string,
      MIGRATION_FAILURE_MARKER_FILE,
    );
    expect(fs.existsSync(markerPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf-8')) as {
      database: string;
      error: string;
      backupDir: string | null;
    };
    expect(marker.database).toBe('default');
    expect(marker.error).toContain('20260101000000_create_item');
    // 迁移前备份先于执行产生：失败错误必须携带备份目录供指引恢复
    expect(marker.backupDir).toBeTruthy();
    expect(fs.existsSync(marker.backupDir as string)).toBe(true);
  });
});
