import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { AppModule } from '../src/app.module';
import {
  DEMO_WORKFLOW_DEFINITION,
  DEMO_WORKFLOW_KEY,
} from '../src/modules/workflow/workflow-builtin';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

/**
 * workflow 执行引擎基座（CAP-A-11）REST 面 e2e。
 *
 * 该面 2026-09-10 随基座落地从 ai-hub 迁出到独立 workflow 模块，
 * 路径由 /_api/ai/workflows* 变为 /_api/workflows*——本文件即迁移后的归属地，
 * ai-hub.e2e-spec 不再覆盖 workflow 路由。
 */
describe('Workflow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Workflow e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    // WorkflowService.onModuleInit 只把内置 demo upsert 进「启动时的默认库」，
    // 而请求经 x-workspace-id 路由到本套件的一次性工作区库——故此处按同样口径补种，
    // 否则工作区库里没有任何定义，列表恒为空。
    await ws.db.aIWorkflowDefinition.upsert({
      where: { key: DEMO_WORKFLOW_KEY },
      create: {
        key: DEMO_WORKFLOW_KEY,
        name: '项目简介三步流（内置演示）',
        description:
          'AI 起草项目简介 → 人工确认（暂停等待拍板）→ 确认闸门 → AI 生成验收要点',
        definition:
          DEMO_WORKFLOW_DEFINITION as unknown as Prisma.InputJsonObject,
        createdBy: null,
      },
      update: {},
    });
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('认证边界', () => {
    it('未携带令牌访问定义列表应 401', () => {
      return wsHttp.get('/_api/workflows').expect(401);
    });

    it('未携带令牌访问运行列表应 401', () => {
      return wsHttp.get('/_api/workflow-runs').expect(401);
    });
  });

  describe('GET /_api/workflows', () => {
    it('返回定义列表，含 onModuleInit 注册的内置 demo 定义', async () => {
      const res = await wsHttp
        .get('/_api/workflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.map((w: { key: string }) => w.key)).toContain(
        DEMO_WORKFLOW_KEY,
      );
      const demo = res.body.data.find(
        (w: { key: string }) => w.key === DEMO_WORKFLOW_KEY,
      );
      expect(demo).toMatchObject({
        key: DEMO_WORKFLOW_KEY,
        name: expect.any(String),
      });
    });
  });

  describe('GET /_api/workflows/:id', () => {
    it('支持按 key 取详情，并回填步骤摘要（四步：llm/human-confirm/condition/llm）', async () => {
      const res = await wsHttp
        .get(`/_api/workflows/${DEMO_WORKFLOW_KEY}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.key).toBe(DEMO_WORKFLOW_KEY);
      expect(res.body.data.stepsSummary).toEqual([
        { id: 'draft', type: 'llm', title: '起草项目简介' },
        { id: 'review', type: 'human-confirm', title: '人工确认简介' },
        { id: 'gate', type: 'condition', title: '确认通过闸门' },
        { id: 'acceptance', type: 'llm', title: '生成验收要点' },
      ]);
    });

    it('未知 id 应 404', () => {
      return wsHttp
        .get('/_api/workflows/definitely-not-a-workflow')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /_api/workflow-runs', () => {
    it('返回分页信封 { data, meta }', async () => {
      const res = await wsHttp
        .get('/_api/workflow-runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.meta).toMatchObject({
        page: 1,
        pageSize: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });
  });

  describe('GET /_api/workflow-runs/:id', () => {
    it('未知 run id 应 404', () => {
      return wsHttp
        .get('/_api/workflow-runs/definitely-not-a-run')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('POST /_api/workflow-runs/:id/resume', () => {
    it('未知 run id 应 404', () => {
      return wsHttp
        .post('/_api/workflow-runs/definitely-not-a-run/resume')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ resumeData: {} })
        .expect(404);
    });
  });
});
