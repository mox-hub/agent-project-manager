/**
 * CLI Dispatch (e2e)：dispatch-cli → 在线 runtime 守护进程通道 → 结果回桥闭环。
 *
 * 以注册的假 runtime 模拟守护进程：接单（GET dispatches）→ 上报事件与
 * 最终 result → 验证 server 侧 onRuntimeExecutionResult 桥接把 ExecutionRun
 * 推到终态。不 spawn 真实 CLI，全 HTTP 稳定可重复。
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { CliProviderRegistry } from '../src/modules/cli-dispatch/cli-provider.registry';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { createTaskFixture } from './helpers/fixtures';

const RUNTIME_ID = 'e2e-runtime-cli-dispatch';

async function waitForTerminalStatus(
  wsHttp: WsRequest,
  token: string,
  executionRunId: string,
): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res: Response = await wsHttp
      .get(`/_api/ai/execution-runs/${executionRunId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const status = res.body.data?.status as string | undefined;
    if (
      status &&
      !['pending', 'planned', 'in_progress', 'running'].includes(status)
    ) {
      return status;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(
    `execution ${executionRunId} did not reach a terminal status`,
  );
}

describe('CLI Dispatch (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let runtimeSessionId: string;
  let runtimeSessionToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    // 本套件只验证 runtime 通道（假守护进程 + 全 HTTP），不依赖宿主机真实 CLI：
    // 注册 claude-code 假 adapter 保证 isAvailable 判定密闭（无 claude 原生二进制的机器/CI 上仍稳定）
    const registry = app.get(CliProviderRegistry);
    registry.registerAdapter({
      getProviderId: () => 'claude-code',
      detect: async () => ({ available: true, version: 'e2e-stub' }),
      buildCommand: () => ({ cmd: 'echo', args: [], env: {} }),
      parseStream: () => undefined,
      parseFinalResult: () => ({ status: 'failed', artifacts: [] }),
    });
    await registry.detectAllProviders();

    ws = createIsolatedWorkspace('CliDispatch e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    token = loginRes.body.data.accessToken;

    // 注册假 runtime 守护进程（@Public 端点，注册即 online）
    const regRes = await wsHttp.post('/_api/runtime/register').send({
      runtimeId: RUNTIME_ID,
      deviceId: 'e2e-device',
      hostPlatform: process.platform,
      runtimeVersion: '0.1.0',
      protocolVersion: '1.0.0',
      workspaceRoots: [],
      availableProviders: ['file', 'git', 'terminal'],
      cliProviders: ['claude-code'],
    });
    expect(regRes.status).toBe(201);
    runtimeSessionId = regRes.body.data.runtimeSessionId;
    runtimeSessionToken = regRes.body.data.runtimeSessionToken;
    expect(runtimeSessionId).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  /** runtime 会话头（设备协议侧鉴权） */
  function runtimeAuth(request: ReturnType<WsRequest['get']>) {
    return request
      .set('x-runtime-session-id', runtimeSessionId)
      .set('x-runtime-session-token', runtimeSessionToken);
  }

  /** 每个用例自建全套夹具：任务 + ProjectWorkspace（workspaceRoot 一级回退） */
  async function createDispatchFixture(): Promise<{ taskId: string }> {
    const { projectId, taskId } = await createTaskFixture(wsHttp, ws, token);
    await ws.db.projectWorkspace.create({
      data: { projectId, localPath: ws.root },
    });
    return { taskId };
  }

  async function dispatchTask(taskId: string): Promise<string> {
    const res: Response = await wsHttp
      .post(`/_api/ai/tasks/${taskId}/dispatch-cli`)
      .set('Authorization', `Bearer ${token}`)
      .send({ providerId: 'claude-code' })
      .expect(201);
    const executionRunId = res.body.data.executionRunId as string;
    expect(executionRunId).toBeTruthy();
    return executionRunId;
  }

  it('GET /ai/cli-providers 返回 provider 列表', async () => {
    const res: Response = await wsHttp
      .get('/_api/ai/cli-providers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toHaveProperty('providers');
  });

  it('dispatch-cli 走 runtime 通道：接单 → 上报结果 → ExecutionRun 终态 completed', async () => {
    const { taskId } = await createDispatchFixture();
    const executionRunId = await dispatchTask(taskId);

    // 守护进程接单：pending 派发里应包含本次执行（含执行载荷）
    const pollRes: Response = await runtimeAuth(
      wsHttp.get(`/_api/runtime/${RUNTIME_ID}/dispatches`),
    )
      .query({ status: 'pending', limit: 20 })
      .expect(200);
    const dispatches = pollRes.body.data as Array<{
      executionRunId: string;
      prompt?: string;
      workspaceRoot?: string;
      providerId?: string;
    }>;
    const picked = dispatches.find((d) => d.executionRunId === executionRunId);
    expect(picked).toBeTruthy();
    expect(picked!.prompt).toBeTruthy();
    expect(picked!.workspaceRoot).toBe(ws.root);
    expect(picked!.providerId).toBe('claude-code');

    // 上报 started 事件
    await runtimeAuth(
      wsHttp.post(`/_api/runtime/executions/${executionRunId}/events`),
    )
      .send({
        eventType: 'execution.started',
        runtimeId: RUNTIME_ID,
        status: 'running',
      })
      .expect(201);

    // 上报最终结果 → server 侧结果回桥
    await runtimeAuth(
      wsHttp.post(`/_api/runtime/executions/${executionRunId}/result`),
    )
      .send({
        status: 'completed',
        summary: 'e2e runtime finished',
        artifacts: [{ type: 'result', ref: 'e2e' }],
        error: null,
      })
      .expect(201);

    const status = await waitForTerminalStatus(wsHttp, token, executionRunId);
    expect(status).toBe('completed');
  }, 30_000);

  it('POST /ai/execution-runs/:id/cancel 置为 blocked 终态（含取消原因）', async () => {
    const { taskId } = await createDispatchFixture();
    const executionRunId = await dispatchTask(taskId);

    await wsHttp
      .post(`/_api/ai/execution-runs/${executionRunId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'e2e cancel' })
      .expect(201);

    const status = await waitForTerminalStatus(wsHttp, token, executionRunId);
    // server 既定语义：取消置 blocked（metadata.cancellationReason 记录原因）
    expect(status).toBe('blocked');
  }, 30_000);

  it('dispatch 不存在的任务返回 404', async () => {
    await wsHttp
      .post('/_api/ai/tasks/nonexistent/dispatch-cli')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(404);
  });
});
