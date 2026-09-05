import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let adminUserId: string;
  let notificationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Notifications e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const user = await ws.db.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) throw new Error('fixture: workspace db has no user');
    adminUserId = user.id;

    // 事件订阅链路依赖运行时环境，这里直接种一条未读通知保证确定性
    const created = await ws.db.notification.create({
      data: {
        userId: adminUserId,
        type: 'task.assigned',
        title: 'E2E 通知',
        body: 'Seeded by e2e',
        channels: ['in-app'],
        status: 'unread',
      },
    });
    notificationId = created.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/notifications', () => {
    it('should list notifications of current user', () => {
      return wsHttp
        .get('/_api/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(notificationId);
        });
    });
  });

  describe('GET /_api/notifications/unread-count', () => {
    it('should report unread count >= 1', () => {
      return wsHttp
        .get('/_api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toMatch(/[1-9]/);
        });
    });
  });

  describe('POST /_api/notifications/read', () => {
    it('should mark notification as read', () => {
      return wsHttp
        .post('/_api/notifications/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ids: [notificationId] })
        .expect(201)
        .then(() =>
          wsHttp
            .get('/_api/notifications/unread-count')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .expect((res: Response) => {
              const text = JSON.stringify(res.body.data);
              expect(text).not.toMatch(/"(count|unread)":\s*[1-9]/);
            }),
        );
    });
  });

  describe('GET /_api/notifications/preferences', () => {
    it('should return preferences', () => {
      return wsHttp
        .get('/_api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('PUT /_api/notifications/preferences', () => {
    it('should update preferences', () => {
      return wsHttp
        .put('/_api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          preferences: [{ eventType: 'task.assigned', channels: ['in-app'] }],
        })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  // 事件→通知生成链路（曾经只测读写端点，订阅者断链/偏好误杀均无测试兜底）
  describe('事件→通知生成链路（task.created 全链路）', () => {
    it('创建任务后项目成员收到通知、创建者不收（偏好未配置=默认开启）', async () => {
      const peer = await ws.db.user.create({
        data: {
          username: 'notif-peer',
          displayName: 'Peer',
          authProvider: 'local',
        },
      });
      const project = await ws.db.project.create({
        data: {
          name: 'Notif Chain Project',
          type: 'team',
          visibility: 'internal',
          status: 'active',
          createdBy: adminUserId,
        },
      });
      await ws.db.projectModule.create({
        data: { projectId: project.id, code: 'NT', name: '通知链路' },
      });
      await ws.db.projectMember.create({
        data: { projectId: project.id, userId: adminUserId, role: 'owner' },
      });
      await ws.db.projectMember.create({
        data: { projectId: project.id, userId: peer.id, role: 'maintainer' },
      });

      const createdRes = await wsHttp
        .post('/_api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '链路任务',
          projectId: project.id,
          type: 'task',
          moduleCode: 'NT',
        })
        .expect(201);
      const taskId = createdRes.body.data.id;

      // 订阅者在请求后异步落库，轮询等待（上限 5s）
      const deadline = Date.now() + 5000;
      let rows: Array<{ userId: string }> = [];
      while (Date.now() < deadline) {
        rows = await ws.db.notification.findMany({
          where: { type: 'task.created', taskId },
        });
        if (rows.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      expect(rows).toHaveLength(1);
      expect(rows[0].userId).toBe(peer.id);
      expect(rows[0].userId).not.toBe(adminUserId);
    }, 15000);
  });
});
