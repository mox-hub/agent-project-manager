/**
 * 工作区备份服务单测（CAP-A-03 / GAP-T-52 服务侧）。
 *
 * 全程真实 SQLite：临时目录 + 仓库模板库副本，WORKSPACE_REGISTRY_PATH /
 * WORKSPACE_BACKUP_DIR / DATABASE_URL 全部落到一次性临时目录，
 * 绝不触碰仓库 dev.db 与根 workspaces.json。
 * 数据层连接失效以 stub 注入（单测不装配 Nest），断言其被正确调用。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { LoggerService } from '@/core/logger/logger.service';
import { PrismaService } from '@/core/database/prisma.service';
import {
  DEFAULT_WORKSPACE_ID,
  createWorkspace,
  findWorkspace,
} from '@/core/database/workspace-registry.util';
import {
  BACKUP_RETENTION_LIMIT,
  WorkspaceBackupService,
  escapeSqliteTextLiteral,
} from './backup.service';

describe('WorkspaceBackupService', () => {
  let tmpRoot: string;
  let backupDir: string;
  let defaultDbPath: string;
  let service: WorkspaceBackupService;
  let invalidateConnections: ReturnType<typeof vi.fn>;
  let reconnectBaseConnection: ReturnType<typeof vi.fn>;
  let wsAId: string;
  let wsBId: string;
  const prevEnv: Record<string, string | undefined> = {};

  const setEnv = (key: string, value: string) => {
    if (!(key in prevEnv)) prevEnv[key] = process.env[key];
    process.env[key] = value;
  };

  const toFileUrl = (p: string) => 'file:' + p.replace(/\\/g, '/');

  const openDb = async (dbPath: string): Promise<PrismaClient> =>
    new PrismaClient({ datasources: { db: { url: toFileUrl(dbPath) } } });

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-backup-unit-'));
    backupDir = path.join(tmpRoot, '.apm-backups');
    defaultDbPath = path.join(tmpRoot, 'default-dev.db');
    fs.copyFileSync(
      path.resolve(process.cwd(), 'prisma', 'template.db'),
      defaultDbPath,
    );

    setEnv('DATABASE_URL', toFileUrl(defaultDbPath));
    setEnv('WORKSPACE_REGISTRY_PATH', path.join(tmpRoot, 'workspaces.json'));
    setEnv('WORKSPACE_BACKUP_DIR', backupDir);
    setEnv(
      'WORKSPACE_TEMPLATE_PATH',
      path.resolve(process.cwd(), 'prisma', 'template.db'),
    );

    const wsA = createWorkspace({
      name: '单测工作区A',
      path: path.join(tmpRoot, 'ws-a'),
    });
    const wsB = createWorkspace({
      name: '单测工作区B',
      path: path.join(tmpRoot, 'ws-b'),
    });
    wsAId = wsA.id;
    wsBId = wsB.id;

    invalidateConnections = vi.fn(async () => []);
    reconnectBaseConnection = vi.fn(async () => undefined);
    const prismaStub = {
      invalidateWorkspaceConnections: invalidateConnections,
      reconnectBaseConnection,
    } as unknown as PrismaService;
    const loggerStub = {
      setContext: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as LoggerService;
    service = new WorkspaceBackupService(loggerStub, prismaStub);
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    // Windows 文件句柄释放有延迟：清理容错，失败不挂测试
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  it('escapeSqliteTextLiteral 转义单引号（VACUUM INTO 路径注入防护）', () => {
    expect(escapeSqliteTextLiteral("D:/db/it's.db")).toBe("D:/db/it''s.db");
    expect(escapeSqliteTextLiteral("a'b'c")).toBe("a''b''c");
    expect(escapeSqliteTextLiteral('no-quote.db')).toBe('no-quote.db');
  });

  it('scope=workspace 备份：meta.json 内容正确，快照库可打开查询', async () => {
    const backup = await service.createBackup({
      scope: 'workspace',
      workspaceId: wsAId,
    });

    expect(backup.scope).toBe('workspace');
    expect(backup.workspaceId).toBe(wsAId);
    expect(backup.workspaceName).toBe('单测工作区A');
    expect(backup.files).toHaveLength(1);
    expect(backup.files[0]).toMatchObject({
      name: `${wsAId}.db`,
      kind: 'database',
      workspaceId: wsAId,
    });
    expect(backup.files[0].sizeBytes).toBeGreaterThan(0);
    expect(backup.totalBytes).toBeGreaterThan(0);

    const dir = path.join(backupDir, backup.id);
    expect(fs.existsSync(path.join(dir, 'meta.json'))).toBe(true);
    // 单区备份不含注册表快照
    expect(fs.existsSync(path.join(dir, 'workspaces.json'))).toBe(false);

    // 快照是合法 SQLite：能打开并查到模板库种子数据（非静态库走 VACUUM INTO 分支）
    const snapshotDb = await openDb(path.join(dir, `${wsAId}.db`));
    try {
      const users = await snapshotDb.user.count();
      expect(users).toBeGreaterThan(0);
    } finally {
      await snapshotDb.$disconnect();
    }
  });

  it('scope=all 备份：注册表快照 + 枚举 default 与全部工作区，default 走 VACUUM INTO', async () => {
    const backup = await service.createBackup({ scope: 'all' });

    expect(backup.scope).toBe('all');
    const kinds = backup.files.map((f) => f.kind);
    expect(kinds.filter((k) => k === 'registry')).toHaveLength(1);
    const dbFiles = backup.files.filter((f) => f.kind === 'database');
    expect(dbFiles.map((f) => f.workspaceId)).toEqual(
      expect.arrayContaining([DEFAULT_WORKSPACE_ID, wsAId, wsBId]),
    );

    const dir = path.join(backupDir, backup.id);
    expect(fs.existsSync(path.join(dir, 'workspaces.json'))).toBe(true);
    // 注册表快照内容与当前注册表一致
    const snapshotRegistry = JSON.parse(
      fs.readFileSync(path.join(dir, 'workspaces.json'), 'utf-8'),
    );
    expect(snapshotRecords(snapshotRegistry)).toContain(wsAId);

    // default 库恒走 VACUUM INTO：快照是合法 SQLite 且含种子数据
    const defaultSnapshot = path.join(dir, `${DEFAULT_WORKSPACE_ID}.db`);
    const client = await openDb(defaultSnapshot);
    try {
      expect(await client.user.count()).toBeGreaterThan(0);
    } finally {
      await client.$disconnect();
    }
  });

  it('滚动清理：超过保留份数后删最旧', async () => {
    const created: string[] = [];
    for (let i = 0; i < BACKUP_RETENTION_LIMIT + 1; i += 1) {
      const backup = await service.createBackup({
        scope: 'workspace',
        workspaceId: wsBId,
      });
      created.push(backup.id);
      // 人为错开 createdAt，避免同毫秒排序歧义
      await new Promise((r) => setTimeout(r, 5));
    }
    const list = service.listBackups().filter((b) => b.workspaceId === wsBId);
    expect(list).toHaveLength(BACKUP_RETENTION_LIMIT);
    expect(list.map((b) => b.id)).not.toContain(created[0]);
    expect(list.map((b) => b.id)).toContain(created[created.length - 1]);
    expect(fs.existsSync(path.join(backupDir, created[0]))).toBe(false);
  });

  it('恢复强确认：confirm 不匹配返回 400 且无任何副作用', async () => {
    const marker = `UNIT-MARKER-${Date.now()}`;
    const wsADbPath = path.join(tmpRoot, 'ws-a', 'data', 'apm.db');
    const writer = await openDb(wsADbPath);
    try {
      await writer.aIModelConfig.create({
        data: { name: marker, provider: 'openai' },
      });
    } finally {
      await writer.$disconnect();
    }

    const backup = await service.createBackup({
      scope: 'workspace',
      workspaceId: wsAId,
    });

    const eraser = await openDb(wsADbPath);
    try {
      await eraser.aIModelConfig.deleteMany({ where: { name: marker } });
    } finally {
      await eraser.$disconnect();
    }

    const countBefore = service.listBackups().length;
    invalidateConnections.mockClear();
    reconnectBaseConnection.mockClear();

    await expect(
      service.restoreBackup(backup.id, { confirm: '错误确认文案' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // 无副作用：不产生恢复前自动备份、不动连接、数据未还原
    expect(service.listBackups().length).toBe(countBefore);
    expect(invalidateConnections).not.toHaveBeenCalled();
    expect(reconnectBaseConnection).not.toHaveBeenCalled();
    const stillDeleted = await openDb(wsADbPath);
    try {
      expect(
        await stillDeleted.aIModelConfig.count({ where: { name: marker } }),
      ).toBe(0);
    } finally {
      await stillDeleted.$disconnect();
    }
  });

  it('恢复单区：正确 confirm 还原数据，产生 pre-restore 自动备份并断言连接失效', async () => {
    const marker = `UNIT-MARKER-RESTORE-${Date.now()}`;
    const wsADbPath = path.join(tmpRoot, 'ws-a', 'data', 'apm.db');
    const writer = await openDb(wsADbPath);
    try {
      await writer.aIModelConfig.create({
        data: { name: marker, provider: 'openai' },
      });
    } finally {
      await writer.$disconnect();
    }

    const backup = await service.createBackup({
      scope: 'workspace',
      workspaceId: wsAId,
    });
    const eraser = await openDb(wsADbPath);
    try {
      await eraser.aIModelConfig.deleteMany({ where: { name: marker } });
    } finally {
      await eraser.$disconnect();
    }

    invalidateConnections.mockClear();
    reconnectBaseConnection.mockClear();

    const result = await service.restoreBackup(backup.id, {
      confirm: '单测工作区A',
    });
    expect(result.restoredBackupId).toBe(backup.id);
    expect(result.restoredWorkspaces).toEqual([wsAId]);
    expect(result.registryRestored).toBe(false);

    // 恢复前自动备份：reason=pre-restore 的新备份目录
    const list = service.listBackups();
    const preRestore = list.find((b) => b.id === result.preRestoreBackupId);
    expect(preRestore).toBeTruthy();
    expect(preRestore?.reason).toBe('pre-restore');
    expect(preRestore?.scope).toBe('all');

    // 连接失效：含该工作区库 URL 与原始 DATABASE_URL（基座实例匹配键）
    expect(invalidateConnections).toHaveBeenCalledTimes(1);
    const invalidatedUrls = invalidateConnections.mock.calls[0][0] as string[];
    expect(invalidatedUrls).toContain(toFileUrl(wsADbPath));
    expect(invalidatedUrls).toContain(process.env.DATABASE_URL);
    expect(reconnectBaseConnection).toHaveBeenCalled();

    // 数据还原断言
    const reader = await openDb(wsADbPath);
    try {
      const restored = await reader.aIModelConfig.findFirst({
        where: { name: marker },
      });
      expect(restored).not.toBeNull();
    } finally {
      await reader.$disconnect();
    }
  });

  it('恢复全库：注册表与全部库回写（点时还原），reconnectBase 被调用', async () => {
    const backup = await service.createBackup({ scope: 'all' });

    // 备份之后制造漂移：新工作区 + default 库标记数据再删除
    const wsC = createWorkspace({
      name: '备份后新建',
      path: path.join(tmpRoot, 'ws-c'),
    });
    const marker = `UNIT-DEFAULT-MARKER-${Date.now()}`;
    const writer = await openDb(defaultDbPath);
    try {
      await writer.aIModelConfig.create({
        data: { name: marker, provider: 'openai' },
      });
      await writer.aIModelConfig.deleteMany({ where: { name: marker } });
    } finally {
      await writer.$disconnect();
    }

    invalidateConnections.mockClear();
    reconnectBaseConnection.mockClear();

    const result = await service.restoreBackup(backup.id, {
      confirm: 'RESTORE ALL',
    });
    expect(result.restoredBackupId).toBe(backup.id);
    expect(result.registryRestored).toBe(true);
    expect(result.restoredWorkspaces).toEqual(
      expect.arrayContaining([DEFAULT_WORKSPACE_ID, wsAId, wsBId]),
    );

    // 点时还原：备份之后注册的工作区从注册表消失
    expect(findWorkspace(wsC.id)).toBeNull();

    // default 库还原后可打开且结构完好（标记数据本就已删，这里验证库可用）
    const reader = await openDb(defaultDbPath);
    try {
      expect(await reader.user.count()).toBeGreaterThan(0);
    } finally {
      await reader.$disconnect();
    }

    const invalidatedUrls = invalidateConnections.mock.calls[0][0] as string[];
    expect(invalidatedUrls).toContain(process.env.DATABASE_URL);
    expect(reconnectBaseConnection).toHaveBeenCalled();
  });

  it('非法入参：缺 workspaceId 400、未知工作区 404、未知备份 404、路径穿越 400', async () => {
    await expect(
      service.createBackup({ scope: 'workspace' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createBackup({ scope: 'workspace', workspaceId: 'ghost' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.restoreBackup('backup-not-exists', { confirm: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.restoreBackup('..%2Fevil', { confirm: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

/** 注册表快照内容 → 工作区 id 列表 */
function snapshotRecords(registry: unknown): string[] {
  return (registry as Array<{ id: string }>).map((r) => r.id);
}
