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

/**
 * 主 AI 助手 CLI 对话桥全链路（不 spawn 真实 CLI、不触 LLM）：
 * 注册假 runtime 守护进程 → send(model=cli) 建占位与派发 → 假 runtime 接单
 * （prompt 带 transcript 与工具目录）→ 上报 execution.token/终态 result →
 * AssistantRuntimeBridge 把累积正文落库为 UIMessage JSON 并置 done。
 */
const RUNTIME_ID = 'e2e-runtime-assistant-chat';

describe('AI Assistant CLI chat bridge (e2e, local-only paths)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let runtimeSessionId: string;
  let runtimeSessionToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Assistant CLI chat e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const project = await ws.db.project.create({
      data: {
        name: 'Assistant CLI chat e2e Project',
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

  function runtimeAuth(request: ReturnType<WsRequest['get']>) {
    return request
      .set('x-runtime-session-id', runtimeSessionId)
      .set('x-runtime-session-token', runtimeSessionToken);
  }

  it('无在线 runtime 时 send(model=cli) 返回可读 400', async () => {
    const res = await wsHttp
      .post('/_api/ai/assistant/messages')
      .set(auth())
      .send({ content: 'hi', projectId, model: 'cli' })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('守护进程');
  });

  it('GET /ai/assistant/models 返回在线 CLI 通道', async () => {
    // 注册假 runtime 守护进程（@Public 端点，注册即 online）
    const regRes = await wsHttp.post('/_api/runtime/register').send({
      runtimeId: RUNTIME_ID,
      deviceId: 'e2e-device-assistant',
      hostPlatform: process.platform,
      runtimeVersion: '0.1.0',
      protocolVersion: '1.0.0',
      workspaceRoots: [],
      availableProviders: ['file', 'git'],
      cliProviders: ['claude-code'],
    });
    expect(regRes.status).toBe(201);
    runtimeSessionId = regRes.body.data.runtimeSessionId;
    runtimeSessionToken = regRes.body.data.runtimeSessionToken;

    const models = await wsHttp
      .get('/_api/ai/assistant/models')
      .set(auth())
      .expect(200);
    const ids = (models.body.data.models as Array<{ id: string }>).map(
      (m) => m.id,
    );
    expect(ids).toContain('cli');
    expect(ids).toContain('cli:claude-code');
  });

  it('CLI 对话全链路：占位 → 接单（prompt 带 transcript/工具目录）→ token 回流 → 终态落库', async () => {
    const sendRes: Response = await wsHttp
      .post('/_api/ai/assistant/messages')
      .set(auth())
      .send({ content: '帮我梳理一下风险', projectId, model: 'cli' })
      .expect(201);
    const { executionRunId, mode, message } = sendRes.body.data;
    expect(mode).toBe('runtime');
    expect(executionRunId).toBeTruthy();
    expect(message.metadata?.status ?? 'running').toBeTruthy();

    // 假 runtime 接单：pending 派发应包含本次执行，prompt 带 transcript 与工具目录
    const pollRes: Response = await runtimeAuth(
      wsHttp.get(`/_api/runtime/${RUNTIME_ID}/dispatches`),
    )
      .query({ status: 'pending', limit: 20 })
      .expect(200);
    const dispatches = pollRes.body.data as Array<{
      executionRunId: string;
      prompt?: string;
    }>;
    const dispatch = dispatches.find(
      (d) => d.executionRunId === executionRunId,
    );
    expect(dispatch).toBeTruthy();
    expect(dispatch!.prompt).toContain('对话记录');
    expect(dispatch!.prompt).toContain('propose_decision');
    expect(dispatch!.prompt).toContain('帮我梳理一下风险');

    // 执行开始 → token（正文借 summary 批量送达）→ 终态 result
    await runtimeAuth(
      wsHttp.post(`/_api/runtime/executions/${executionRunId}/events`),
    )
      .send({
        eventType: 'execution.started',
        runtimeId: RUNTIME_ID,
        status: 'running',
      })
      .expect(201);
    await runtimeAuth(
      wsHttp.post(`/_api/runtime/executions/${executionRunId}/events`),
    )
      .send({
        eventType: 'execution.token',
        runtimeId: RUNTIME_ID,
        summary: '结论：风险可控。',
      })
      .expect(201);
    await runtimeAuth(
      wsHttp.post(`/_api/runtime/executions/${executionRunId}/events`),
    )
      .send({
        eventType: 'execution.token',
        runtimeId: RUNTIME_ID,
        summary: '建议先收敛范围。',
      })
      .expect(201);
    await runtimeAuth(
      wsHttp.post(`/_api/runtime/executions/${executionRunId}/result`),
    )
      .send({ status: 'completed', summary: '任务执行完成' })
      .expect(201);

    // 轮询会话：占位消息被原位替换为终态 UIMessage JSON
    let finalized = false;
    for (let i = 0; i < 20 && !finalized; i++) {
      const current = await wsHttp
        .get('/_api/ai/assistant/conversations/current')
        .query({ projectId })
        .set(auth())
        .expect(200);
      const messages = current.body.data.messages as Array<{
        role: string;
        content: string;
        metadata?: { status?: string };
      }>;
      const assistantMessage = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant');
      if (assistantMessage?.metadata?.status === 'done') {
        finalized = true;
        expect(assistantMessage.content).toContain('结论：风险可控。');
        expect(assistantMessage.content).toContain('建议先收敛范围。');
        expect(assistantMessage.content).toContain('"parts"');
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    expect(finalized).toBe(true);
  });
});
