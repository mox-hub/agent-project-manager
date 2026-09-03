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
 * 主 AI 助手端点闭环（不触 LLM）：
 * - 长驻会话 find-or-create 幂等（两次 current 同 id）
 * - 作用域隔离（全局 vs 项目会话不同 id）
 * - 无 provider 时发消息走 400 错误路径
 */
describe('AI Assistant (e2e, local-only paths)', () => {
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

    ws = createIsolatedWorkspace('Assistant e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    // 项目作用域会话需要真实项目（projectId 外键）
    const project = await ws.db.project.create({
      data: {
        name: 'Assistant e2e Project',
        type: 'team',
        visibility: 'internal',
        status: 'active',
        createdBy: 'e2e',
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  describe('GET /_api/ai/assistant/conversations/current', () => {
    it('首次创建，再次访问幂等同 id', async () => {
      const first = await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .set(auth())
        .expect(200);
      const conversationId = first.body.data.conversationId;
      expect(conversationId).toBeTruthy();
      expect(first.body.data.messages).toEqual([]);

      const second = await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .set(auth())
        .expect(200);
      expect(second.body.data.conversationId).toBe(conversationId);
    });

    it('工作区与项目作用域会话相互隔离', async () => {
      const globalRes = await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .set(auth())
        .expect(200);
      const projectRes = await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .query({ projectId })
        .set(auth())
        .expect(200);
      expect(projectRes.body.data.conversationId).not.toBe(
        globalRes.body.data.conversationId,
      );
    });
  });

  describe('会话历史（新建/列表/切换）', () => {
    it('新建对话进入列表首位并成为当前会话', async () => {
      const created = await wsHttp
        .post('/_api/ai/assistant/conversations')
        .set(auth())
        .send({})
        .expect(201);
      const newId = created.body.data.conversationId;
      expect(newId).toBeTruthy();

      const list = await wsHttp
        .get('/_api/ai/assistant/conversations')
        .set(auth())
        .expect(200);
      expect(Array.isArray(list.body.data)).toBe(true);
      expect(list.body.data.length).toBeGreaterThanOrEqual(1);
      expect(list.body.data[0].id).toBe(newId);
      expect(list.body.data[0].messageCount).toBe(0);

      const current = await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .set(auth())
        .expect(200);
      expect(current.body.data.conversationId).toBe(newId);
    });

    it('跨作用域切换被拒绝', async () => {
      const g = await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .set(auth())
        .expect(200);
      const globalId = g.body.data.conversationId;

      await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .query({ projectId, conversationId: globalId })
        .set(auth())
        .expect(400);
    });
  });

  describe('POST /_api/ai/assistant/messages', () => {
    it('content 必填（管线校验，不触服务层）', async () => {
      await wsHttp
        .post('/_api/ai/assistant/messages')
        .set(auth())
        .send({})
        .expect(400);
    });
    // 注意：正常发送路径依赖 LLM provider（jest 进程会加载 dev 库 provider），
    // e2e 不做真实 LLM 调用——发送闭环由前端 vitest + assistant.service 单测覆盖。
  });
});
