/**
 * 异常流抽样（测试映射矩阵 GAP-T-05 部分清偿）：
 * issue 与 project 两模块各 3 条核心 API 错误路径——
 * 400 校验拒绝 / 404 资源不存在 / 重复删除 / 越权 workspace 头隔离。
 * 抽样原则：不与 issue/project 既有 e2e 的错误用例重复。
 */
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

describe('Error paths: issue / project 异常流抽样 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('ErrorPaths e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const res = await wsHttp
      .post('/_api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: '异常流抽样项目',
        type: 'team',
        visibility: 'private',
      })
      .expect(201);
    projectId = res.body.data.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  // ─── issue 模块 ────────────────────────────────────────────────

  describe('POST /_api/issues（400 校验拒绝）', () => {
    it('should 400 when required fields missing', () => {
      return wsHttp
        .post('/_api/issues')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: '缺 projectId 与 title' })
        .expect(400);
    });
  });

  describe('POST /_api/issues（404 项目不存在）', () => {
    it('should 404 when project does not exist', () => {
      return wsHttp
        .post('/_api/issues')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId: 'proj-missing', title: '孤儿任务' })
        .expect(404);
    });
  });

  describe('GET /_api/issues/:id（越权 workspace 头隔离）', () => {
    it('should 401 when workspace header is not the owner', async () => {
      const created = await wsHttp
        .post('/_api/issues')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId, title: '隔离断言任务' })
        .expect(201);
      const issueId = created.body.data.id as string;

      // 未注册的工作区头：请求者在该工作区无身份，认证守卫直接拒绝
      // （数据按工作区物理隔离，语义为 401 而非 404 资源不可见）
      const stranger = wsRequest(app, 'ws-not-registered-e2e');
      return stranger
        .get(`/_api/issues/${issueId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  // ─── project 模块 ──────────────────────────────────────────────

  describe('POST /_api/projects（400 校验拒绝）', () => {
    it('should 400 when name missing', () => {
      return wsHttp
        .post('/_api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'team' })
        .expect(400);
    });
  });

  describe('PATCH /_api/projects/:id（403 成员守卫遮蔽）', () => {
    it('should 403 on updating non-existent project', () => {
      return wsHttp
        .patch('/_api/projects/proj-missing')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '改名' })
        .expect(403);
    });
  });

  describe('POST /_api/projects/:id/archive（重复提交幂等）', () => {
    it('should stay archived on repeated archive', async () => {
      const created = await wsHttp
        .post('/_api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '待归档项目',
          type: 'team',
          visibility: 'private',
        })
        .expect(201);
      const doomedId = created.body.data.id as string;

      await wsHttp
        .post(`/_api/projects/${doomedId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((r: Response) => {
          expect([200, 201]).toContain(r.status);
        });

      // 重复归档：archive 为幂等 update，第二次仍成功且状态不变
      await wsHttp
        .post(`/_api/projects/${doomedId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((r: Response) => {
          expect([200, 201]).toContain(r.status);
        });

      const detail = await wsHttp
        .get(`/_api/projects/${doomedId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(detail.body.data.status).toBe('archived');
    });
  });
});
