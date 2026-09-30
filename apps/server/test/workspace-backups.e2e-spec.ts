/**
 * 工作区备份与恢复 e2e（CAP-A-03 / GAP-T-52）。
 *
 * 环境隔离：backup-env 必须是第一个 import——DATABASE_URL / 注册表 /
 * 备份目录全部落在一次性临时目录（模板库副本做默认库），不触碰真实 dev.db。
 *
 * 认证口径：JWT 校验按「请求工作区库」查 Session，跨工作区令牌不通用，
 * 故 wsA 上下文与 default 上下文各自登录、各用各的令牌。
 *
 * 链路：建工作区 → 写入数据 → 备份 → 改库（删数据）→ 恢复 → 数据还原断言，
 * 另覆盖 confirm 错误 400 与「恢复前自动备份产生新备份目录」。
 * 注意：所有测试进程内的直连客户端在恢复前必须断开——Windows 上
 * 恢复覆盖库文件会被本进程持有的 SQLite 句柄挡住。
 */
import './helpers/backup-env';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { createTaskFixture } from './helpers/fixtures';
import { BACKUP_E2E_DB, BACKUP_E2E_DIR } from './helpers/backup-env';

describe('Workspace backups (e2e)', () => {
  let app: INestApplication;
  /** default 上下文令牌（备份/恢复端点与 default 库数据访问用） */
  let token: string;
  /** wsA 上下文令牌（wsA 库数据访问用） */
  let tokenA: string;
  let wsA: IsolatedWorkspace;
  let wsB: IsolatedWorkspace;
  let wsHttpA: WsRequest;
  let wsHttpDefault: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    wsA = createIsolatedWorkspace('Backup e2e A');
    wsB = createIsolatedWorkspace('Backup e2e B');
    wsHttpA = wsRequest(app, wsA.id);
    wsHttpDefault = wsRequest(app, 'default');

    const loginDefault = await wsHttpDefault.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    token = loginDefault.body.data.accessToken;
    const loginA = await wsHttpA.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    tokenA = loginA.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await wsA.cleanup();
    await wsB.cleanup();
    // Windows 句柄释放延迟：临时目录清理容错
    try {
      fs.rmSync(path.dirname(BACKUP_E2E_DIR), { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  /** default 库任务夹具：项目与工单走 HTTP（default 上下文），模块/状态直连播种后断开 */
  async function createDefaultDbTaskFixture(): Promise<string> {
    const projectRes = await wsHttpDefault
      .post('/_api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `E2E Default Marker ${Date.now()}`,
        description: 'Created by backup e2e',
        type: 'team',
        visibility: 'private',
      });
    expect(projectRes.status).toBe(201);
    const projectId = projectRes.body.data.id as string;

    const db = new PrismaClient({
      datasources: { db: { url: 'file:' + BACKUP_E2E_DB.replace(/\\/g, '/') } },
    });
    try {
      await db.projectModule.create({
        data: { projectId, code: 'BK', name: '备份演练' },
      });
      await db.statusDefinition.createMany({
        data: [
          { projectId, type: 'task', key: 'todo', name: '待办', order: 1 },
          {
            projectId,
            type: 'task',
            key: 'in_progress',
            name: '进行中',
            order: 2,
          },
        ],
      });
    } finally {
      await db.$disconnect();
    }

    const issueRes = await wsHttpDefault
      .post('/_api/issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, moduleCode: 'BK', title: '全库恢复标记工单' });
    expect(issueRes.status).toBe(201);
    return issueRes.body.data.id as string;
  }

  it('单区备份→删数据→错误 confirm 400→正确恢复→数据还原 + 恢复前自动备份', async () => {
    // 1. 写入数据（项目 + 模块 + 状态 + 工单），随后断开测试直连客户端
    const { issueId, projectId } = await createTaskFixture(
      wsHttpA,
      wsA,
      tokenA,
    );
    await wsA.db.$disconnect();

    // 2. 单区备份
    const backupRes = await wsHttpDefault
      .post('/_api/workspaces/backups')
      .set('Authorization', `Bearer ${token}`)
      .send({ scope: 'workspace', workspaceId: wsA.id })
      .expect(201);
    const backup = backupRes.body.data;
    expect(backup.scope).toBe('workspace');
    expect(backup.workspaceId).toBe(wsA.id);
    expect(backup.workspaceName).toBe('Backup e2e A');
    expect(backup.files).toHaveLength(1);
    expect(backup.totalBytes).toBeGreaterThan(0);
    const backupDir = path.join(BACKUP_E2E_DIR, backup.id);
    expect(fs.existsSync(path.join(backupDir, 'meta.json'))).toBe(true);
    expect(fs.existsSync(path.join(backupDir, `${wsA.id}.db`))).toBe(true);

    // 3. 改库：删除工单
    await wsHttpA
      .delete(`/_api/issues/${issueId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    await wsHttpA
      .get(`/_api/issues/${issueId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);

    const listBefore = await wsHttpDefault
      .get('/_api/workspaces/backups')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const countBefore: number = listBefore.body.data.backups.length;

    // 4. confirm 错误 → 400 且不产生恢复前自动备份
    await wsHttpDefault
      .post(`/_api/workspaces/backups/${backup.id}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: '随便乱写' })
      .expect(400);
    const afterWrong = await wsHttpDefault
      .get('/_api/workspaces/backups')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(afterWrong.body.data.backups.length).toBe(countBefore);

    // 5. 正确 confirm（= 工作区名称）恢复
    const restoreRes = await wsHttpDefault
      .post(`/_api/workspaces/backups/${backup.id}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: 'Backup e2e A' })
      .expect(201);
    expect(restoreRes.body.data.restoredBackupId).toBe(backup.id);
    expect(restoreRes.body.data.restoredWorkspaces).toContain(wsA.id);
    expect(restoreRes.body.data.registryRestored).toBe(false);
    const preRestoreBackupId: string = restoreRes.body.data.preRestoreBackupId;
    expect(preRestoreBackupId).toBeTruthy();

    // 6. 数据还原断言：被删工单回来了
    const restoredRes = await wsHttpA
      .get(`/_api/issues/${issueId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(restoredRes.body.data.id).toBe(issueId);
    expect(restoredRes.body.data.projectId).toBe(projectId);

    // 7. 恢复前自动备份：列表 +1 且 reason=pre-restore
    const listAfter = await wsHttpDefault
      .get('/_api/workspaces/backups')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listAfter.body.data.backups.length).toBe(countBefore + 1);
    const preRestore = listAfter.body.data.backups.find(
      (b: { id: string }) => b.id === preRestoreBackupId,
    );
    expect(preRestore).toBeTruthy();
    expect(preRestore.reason).toBe('pre-restore');
    expect(preRestore.scope).toBe('all');
  });

  it('全库备份→改库→RESTORE ALL 恢复→default 库数据还原', async () => {
    // 1. default 工作区写入标记工单
    const issueId = await createDefaultDbTaskFixture();

    // 2. 全库备份：注册表 + default + 双工作区
    const backupRes = await wsHttpDefault
      .post('/_api/workspaces/backups')
      .set('Authorization', `Bearer ${token}`)
      .send({ scope: 'all' })
      .expect(201);
    const backup = backupRes.body.data;
    expect(backup.scope).toBe('all');
    const dbWorkspaceIds = backup.files
      .filter((f: { kind: string }) => f.kind === 'database')
      .map((f: { workspaceId?: string }) => f.workspaceId);
    expect(dbWorkspaceIds).toContain('default');
    expect(dbWorkspaceIds).toContain(wsA.id);
    expect(dbWorkspaceIds).toContain(wsB.id);
    expect(
      backup.files.some((f: { kind: string }) => f.kind === 'registry'),
    ).toBe(true);

    // 3. 改库：删除 default 标记工单
    await wsHttpDefault
      .delete(`/_api/issues/${issueId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await wsHttpDefault
      .get(`/_api/issues/${issueId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    // 4. RESTORE ALL 恢复
    const restoreRes = await wsHttpDefault
      .post(`/_api/workspaces/backups/${backup.id}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: 'RESTORE ALL' })
      .expect(201);
    expect(restoreRes.body.data.registryRestored).toBe(true);
    expect(restoreRes.body.data.restoredWorkspaces).toContain('default');

    // 5. 数据还原断言（default 库；恢复回写的库含备份时点的 Session，令牌仍有效）
    const restoredRes = await wsHttpDefault
      .get(`/_api/issues/${issueId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(restoredRes.body.data.id).toBe(issueId);
  });

  it('备份列表：时间倒序且结构完整；未认证 401；未知备份恢复 404', async () => {
    const listRes = await wsHttpDefault
      .get('/_api/workspaces/backups')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const backups: Array<{
      id: string;
      createdAt: string;
      scope: string;
      files: Array<{ name: string; sizeBytes: number }>;
      totalBytes: number;
    }> = listRes.body.data.backups;
    expect(backups.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < backups.length; i += 1) {
      expect(backups[i - 1].createdAt >= backups[i].createdAt).toBe(true);
    }
    for (const b of backups) {
      expect(b.id).toMatch(/^backup-/);
      expect(b.files.length).toBeGreaterThan(0);
      expect(b.totalBytes).toBeGreaterThan(0);
    }

    await wsHttpDefault.get('/_api/workspaces/backups').expect(401);
    await wsHttpDefault
      .post('/_api/workspaces/backups/backup-not-exists/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: 'x' })
      .expect(404);
  });
});
