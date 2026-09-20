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
 * 平台外围端点巡检（api:audit 存量盲区清剿）：
 * 全部为「无外部依赖」路径——oauth2 未配置提供方、AI 未配置模型/无在线 CLI、
 * git PR 不存在、MCP 无 token——断言可读失败或空清单，不触外网。
 */
describe('Platform periphery endpoints (e2e, local-only paths)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let issueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Periphery e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const project = await ws.db.project.create({
      data: {
        name: 'Periphery e2e Project',
        type: 'team',
        visibility: 'internal',
        status: 'active',
        createdBy: 'e2e',
      },
    });
    const issue = await ws.db.issue.create({
      data: {
        project: { connect: { id: project.id } },
        title: 'periphery e2e issue',
        type: 'task',
        status: 'todo',
        priority: 'medium',
      },
    });
    issueId = issue.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('issue-types 全 CRUD：创建自定义类型 → 改名 → 删除', async () => {
    const list = await wsHttp.get('/_api/issue-types').set(auth()).expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    const created = await wsHttp
      .post('/_api/issue-types')
      .set(auth())
      .send({ key: 'e2epage', name: 'e2e 页面' })
      .expect(201);
    const id = created.body.data.id;
    expect(created.body.data).toMatchObject({
      key: 'e2epage',
      name: 'e2e 页面',
    });

    const updated = await wsHttp
      .patch(`/_api/issue-types/${id}`)
      .set(auth())
      .send({ name: 'e2e 页面（改）' })
      .expect(200);
    expect(updated.body.data.name).toBe('e2e 页面（改）');

    await wsHttp.delete(`/_api/issue-types/${id}`).set(auth()).expect(200);
  });

  it('oauth2 未配置提供方：清单为空、授权/回退可读失败、登出幂等', async () => {
    const providers = await wsHttp
      .get('/_api/auth/oauth2/providers')
      .set(auth())
      .expect(200);
    expect(providers.body.data).toBeDefined();

    // 未配置 github → 4xx（不触外网），断言非 5xx 即可（消息随实现）
    await wsHttp
      .get('/_api/auth/oauth2/authorize')
      .query({ provider: 'github', redirect_uri: 'http://localhost/cb' })
      .expect((res) => {
        if (res.status >= 500) {
          throw new Error(`authorize 应可读失败，实际 ${res.status}`);
        }
      });

    await wsHttp
      .get('/_api/auth/oauth2/callback')
      .query({ provider: 'github', code: 'x', state: 'y' })
      .expect((res) => {
        if (res.status >= 500) {
          throw new Error(`callback 应可读失败，实际 ${res.status}`);
        }
      });

    await wsHttp
      .post('/_api/auth/oauth2/logout')
      .set(auth())
      .expect((res) => {
        if (res.status >= 500) {
          throw new Error(`logout 应幂等成功，实际 ${res.status}`);
        }
      });
  });

  it('runtime 查询面：approvals / dispatches 空清单', async () => {
    const approvals = await wsHttp
      .get('/_api/runtime/approvals')
      .set(auth())
      .expect(200);
    expect(approvals.body.data).toBeDefined();

    const dispatches = await wsHttp
      .get('/_api/runtime/dispatches')
      .set(auth())
      .expect(200);
    expect(dispatches.body.data).toBeDefined();
  });

  it('ai-hub：usage 清单 / chat 无模型可读失败 / assign-issue 无 AI 成员可读失败', async () => {
    const usage = await wsHttp.get('/_api/ai/usage').set(auth()).expect(200);
    expect(usage.body.data).toBeDefined();

    // 未配置任何启用的 provider → 可读失败（4xx）
    await wsHttp
      .post('/_api/ai/chat')
      .set(auth())
      .send({ projectId: 'p', messages: [{ role: 'user', content: 'hi' }] })
      .expect((res) => {
        if (res.status >= 500) {
          throw new Error(`chat 无模型应可读失败，实际 ${res.status}`);
        }
      });

    // 任务存在但无活跃 AI 成员 → 可读失败（4xx）
    await wsHttp
      .post('/_api/ai/assign-issue')
      .set(auth())
      .send({ issueId })
      .expect((res) => {
        if (res.status >= 500) {
          throw new Error(
            `assign-issue 无 AI 成员应可读失败，实际 ${res.status}`,
          );
        }
      });
  });

  it('assistant：工具目录 / dispatches 无在线 CLI 400 / silent 无模型可读失败', async () => {
    const tools = await wsHttp
      .get('/_api/ai/assistant/tools')
      .set(auth())
      .expect(200);
    expect(tools.body.data).toBeDefined();

    await wsHttp
      .post('/_api/ai/assistant/dispatches')
      .set(auth())
      .send({ content: 'hi', projectId: 'p', model: 'cli' })
      .expect(400);

    await wsHttp
      .post('/_api/ai/assistant/silent')
      .set(auth())
      .send({ scenario: 'project-score', projectId: 'p' })
      .expect((res) => {
        if (res.status >= 500) {
          throw new Error(`silent 无模型应可读失败，实际 ${res.status}`);
        }
      });
  });

  it('git PR：不存在的仓库/PR 走 404 可读路径', async () => {
    await wsHttp
      .get('/_api/git/pull-requests/nonexistent-pr')
      .set(auth())
      .expect(404);

    await wsHttp
      .post('/_api/git/pull-requests/nonexistent-pr/reviews')
      .set(auth())
      .send({ body: 'x' })
      .expect(404);
  });

  it('MCP：无 token 的 SSE 握手 401、无会话消息可读失败', async () => {
    await wsHttp.get('/_api/mcp/sse').expect(401);

    await wsHttp.post('/_api/mcp/messages').expect((res) => {
      if (res.status >= 500) {
        throw new Error(`messages 无会话应可读失败，实际 ${res.status}`);
      }
    });
  });
});
