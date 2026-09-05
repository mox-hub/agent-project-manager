import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

/**
 * 订阅 → 变更推送 全链路（不触 LLM）：
 * 订阅者集合管理（PUT/GET/my）+ 任务状态/优先级变更 → 订阅者收到通知
 * （排除操作者；全域广播不受影响）。
 */
describe('Subscriptions (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Subscriptions e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  it('订阅者集合全量替换 + my 查询', async () => {
    const adminUser = await ws.db.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    const peer = await ws.db.user.create({
      data: {
        username: 'sub-peer',
        displayName: 'Peer',
        authProvider: 'local',
      },
    });
    const m1 = await ws.db.member.create({
      data: {
        shortId: 'subm0001',
        displayName: 'Admin Member',
        type: 'human',
        userId: adminUser!.id,
      },
    });
    const m2 = await ws.db.member.create({
      data: {
        shortId: 'subm0002',
        displayName: 'Peer Member',
        type: 'human',
        userId: peer.id,
      },
    });

    const putRes = await wsHttp
      .put('/_api/subscriptions')
      .set(auth())
      .send({
        entityType: 'task',
        entityId: 'task-e2e-1',
        memberIds: [m1.id, m2.id, m2.id],
      })
      .expect(200);
    expect(putRes.body.data.items).toHaveLength(2);

    const my = await wsHttp
      .get('/_api/subscriptions/my')
      .set(auth())
      .expect(200);
    expect(my.body.data.memberId).toBe(m1.id);
    expect(my.body.data.items).toContainEqual({
      entityType: 'task',
      entityId: 'task-e2e-1',
    });

    // 清理本轮种子（后续用例重建自己的场景）
    await ws.db.subscription.deleteMany({});
  });

  it('任务状态变更推送订阅者（排除操作者）；优先级变更推 fieldChanged', async () => {
    const adminUser = await ws.db.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    const peer = await ws.db.user.create({
      data: {
        username: 'sub-peer-2',
        displayName: 'Peer2',
        authProvider: 'local',
      },
    });
    const project = await ws.db.project.create({
      data: {
        name: 'Sub Project',
        type: 'team',
        visibility: 'internal',
        status: 'active',
        createdBy: adminUser!.id,
      },
    });
    // admin 需为项目成员才能更新任务（可见性规则按项目成员判定）
    await ws.db.projectMember.create({
      data: { projectId: project.id, userId: adminUser!.id, role: 'owner' },
    });
    const task = await ws.db.task.create({
      data: {
        projectId: project.id,
        shortId: 'SB-1',
        title: '订阅链路任务',
        type: 'task',
        status: 'todo',
        priority: 'medium',
        reporterId: adminUser!.id,
      },
    });
    // 订阅者：仅 peer（admin 是操作者，应被排除）
    const peerMember = await ws.db.member.create({
      data: {
        shortId: 'subm0003',
        displayName: 'Peer2 Member',
        type: 'human',
        userId: peer.id,
      },
    });
    await wsHttp
      .put('/_api/subscriptions')
      .set(auth())
      .send({
        entityType: 'task',
        entityId: task.id,
        memberIds: [peerMember.id],
      })
      .expect(200);

    await wsHttp
      .patch(`/_api/tasks/${task.id}`)
      .set(auth())
      .send({ status: 'done' })
      .expect(200);

    // 订阅推送异步落库，轮询等待
    const deadline = Date.now() + 5000;
    let statusRows: Array<{ userId: string }> = [];
    while (Date.now() < deadline) {
      statusRows = await ws.db.notification.findMany({
        where: { type: 'task.statusChanged', taskId: task.id },
      });
      if (statusRows.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(statusRows).toHaveLength(1);
    expect(statusRows[0].userId).toBe(peer.id);

    await wsHttp
      .patch(`/_api/tasks/${task.id}`)
      .set(auth())
      .send({ priority: 'critical' })
      .expect(200);

    const deadline2 = Date.now() + 5000;
    let fieldRows: Array<{ userId: string }> = [];
    while (Date.now() < deadline2) {
      fieldRows = await ws.db.notification.findMany({
        where: { type: 'task.fieldChanged', taskId: task.id },
      });
      if (fieldRows.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(fieldRows).toHaveLength(1);
    expect(fieldRows[0].userId).toBe(peer.id);
  });
});
