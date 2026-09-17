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

    // provider 可用性探测与执行同语义走 DB 覆盖：把 claude-code 的
    // commandPath 指到 node，使判定不依赖本机是否安装 claude CLI
    // （保持本套件「不 spawn 真实 CLI、全 HTTP 稳定可重复」的承诺）
    await ws.db.cliProviderConfig.create({
      data: {
        providerId: 'claude-code',
        commandPath: process.execPath,
        enabled: true,
      },
    });
    await wsHttp
      .get('/_api/ai/cli-providers/detect')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
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
  async function createDispatchFixture(): Promise<{
    projectId: string;
    issueId: string;
  }> {
    const { projectId, issueId } = await createTaskFixture(wsHttp, ws, token);
    await ws.db.projectWorkspace.create({
      data: { projectId, localPath: ws.root },
    });
    // 兜底改造批 3：派发前验收门禁（严格模式）要求活契约至少 1 条标准
    const acceptance = await ws.db.acceptance.create({
      data: {
        issueId,
        type: 'mixed',
        title: '验收 - e2e',
        completionType: 'artifact',
        status: 'draft',
      },
    });
    await ws.db.acceptanceCriteria.create({
      data: {
        acceptanceId: acceptance.id,
        content: '执行完成后输出结果摘要',
        criteriaType: 'functional',
      },
    });
    return { projectId, issueId };
  }

  async function dispatchTask(issueId: string): Promise<string> {
    const res: Response = await wsHttp
      .post(`/_api/ai/issues/${issueId}/dispatch-cli`)
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
    const { issueId } = await createDispatchFixture();
    const executionRunId = await dispatchTask(issueId);

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

  it('POST /ai/execution-runs/:id/cancel 置为 superseded 终态（含取消原因）', async () => {
    const { issueId } = await createDispatchFixture();
    const executionRunId = await dispatchTask(issueId);

    await wsHttp
      .post(`/_api/ai/execution-runs/${executionRunId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'e2e cancel' })
      .expect(201);

    const status = await waitForTerminalStatus(wsHttp, token, executionRunId);
    // 兜底改造批 2 语义变更：取消置 superseded 终态（与失败/人工阻塞可区分）
    expect(status).toBe('superseded');
  }, 30_000);

  it('dispatch 不存在的任务返回 404', async () => {
    await wsHttp
      .post('/_api/ai/issues/nonexistent/dispatch-cli')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(404);
  });

  /**
   * 兜底批 5 夹具：直接落一条终态原执行（不经派发链，聚焦重试语义）。
   * 复用 createDispatchFixture 保证门禁所需活契约+标准在场。
   */
  async function createRetryFixture(originalStatus: string) {
    const { projectId, issueId } = await createDispatchFixture();
    const acceptance = await ws.db.acceptance.findFirst({
      where: { issueId },
      select: { id: true },
    });
    const original = await ws.db.execution.create({
      data: {
        projectId,
        issueId,
        subjectType: 'external_agent',
        subjectId: 'e2e-retrier',
        identitySource: 'cli',
        goal: 'E2E retry original',
        status: originalStatus,
        input: { task: { id: issueId }, stale: true },
        errorDetail: { reason: 'CLI_EXIT_NONZERO', message: 'boom' },
      },
    });
    return { projectId, issueId, original, acceptanceId: acceptance?.id };
  }

  it('retry 失败执行：克隆新建执行（retryOfId 血缘+retryContext）并走同一 runtime 派发链', async () => {
    const { original, acceptanceId } = await createRetryFixture('failed');

    const res: Response = await wsHttp
      .post(`/_api/ai/execution-runs/${original.id}/retry`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    const newId = res.body.data.executionRunId as string;
    expect(newId).toBeTruthy();
    expect(newId).not.toBe(original.id);
    expect(res.body.data.status).toBe('dispatched');

    // 血缘与内容自动关联：retryOfId 指回原执行、原 input 保留、
    // retryContext 携带原失败原因、验收契约对齐活契约
    const cloned = await ws.db.execution.findUnique({
      where: { id: newId },
    });
    expect(cloned).toBeTruthy();
    expect(cloned!.retryOfId).toBe(original.id);
    expect((cloned!.input as Record<string, unknown>)['stale']).toBe(true);
    const retryContext = (cloned!.input as Record<string, unknown>)[
      'retryContext'
    ] as Record<string, unknown>;
    expect(retryContext['retryOfId']).toBe(original.id);
    expect(retryContext['originalStatus']).toBe('failed');
    expect(
      (retryContext['originalError'] as Record<string, unknown>)['message'],
    ).toBe('boom');
    expect(cloned!.acceptanceId).toBe(acceptanceId ?? null);

    // 原执行保持 failed 终态留痕，不被复用/覆盖
    const after = await ws.db.execution.findUnique({
      where: { id: original.id },
    });
    expect(after!.status).toBe('failed');
    expect(after!.retryOfId).toBeNull();

    // 走相同执行流程：runtime 派发队列应包含新执行，回桥后到 completed
    const pollRes: Response = await runtimeAuth(
      wsHttp.get(`/_api/runtime/${RUNTIME_ID}/dispatches`),
    )
      .query({ status: 'pending', limit: 20 })
      .expect(200);
    const dispatches = pollRes.body.data as Array<{ executionRunId: string }>;
    expect(dispatches.some((d) => d.executionRunId === newId)).toBe(true);

    await runtimeAuth(wsHttp.post(`/_api/runtime/executions/${newId}/events`))
      .send({
        eventType: 'execution.started',
        runtimeId: RUNTIME_ID,
        status: 'running',
      })
      .expect(201);
    await runtimeAuth(wsHttp.post(`/_api/runtime/executions/${newId}/result`))
      .send({
        status: 'completed',
        summary: 'retry done',
        artifacts: [],
        error: null,
      })
      .expect(201);

    const status = await waitForTerminalStatus(wsHttp, token, newId);
    expect(status).toBe('completed');
  }, 30_000);

  it('retry 非 failed/blocked 执行返回 400；不存在的执行返回 404', async () => {
    const { original } = await createRetryFixture('in_progress');
    await wsHttp
      .post(`/_api/ai/execution-runs/${original.id}/retry`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);

    await wsHttp
      .post('/_api/ai/execution-runs/nonexistent/retry')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(404);
  });

  it('retry 派发被验收门禁阻断：新执行落 blocked 留痕，原执行不受影响', async () => {
    // 无活契约标准 → assertDispatchGate 阻断 → 新执行落 blocked
    const { projectId, issueId } = await createTaskFixture(wsHttp, ws, token);
    await ws.db.projectWorkspace.create({
      data: { projectId, localPath: ws.root },
    });
    const original = await ws.db.execution.create({
      data: {
        projectId,
        issueId,
        subjectType: 'external_agent',
        subjectId: 'e2e-retrier',
        identitySource: 'cli',
        goal: 'E2E retry gate-blocked',
        status: 'failed',
      },
    });

    const res: Response = await wsHttp
      .post(`/_api/ai/execution-runs/${original.id}/retry`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);

    // 兜底批 5 语义：克隆体已创建但派发被门禁拦下 → blocked 留痕可观测
    const retried = await ws.db.execution.findMany({
      where: { retryOfId: original.id },
    });
    expect(res.body.data?.error ?? res.body.error).toBeTruthy();
    expect(retried).toHaveLength(1);
    expect(retried[0].status).toBe('blocked');
    expect((retried[0].errorDetail as Record<string, unknown>)['reason']).toBe(
      'RETRY_DISPATCH_FAILED',
    );

    const after = await ws.db.execution.findUnique({
      where: { id: original.id },
    });
    expect(after!.status).toBe('failed');
  }, 30_000);
});
