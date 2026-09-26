import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { CliDispatchService } from '../src/modules/cli-dispatch/dispatch.service';
import { AdapterRegistryService } from '../src/modules/ai-hub/services/adapter-registry.service';
import { UsagePricingService } from '../src/modules/ai-hub/services/usage-pricing.service';
import { MessageBusService } from '../src/core/message-bus/message-bus.service';
import { WorkflowV2EngineService } from '../src/modules/workflow/workflow-v2.engine.service';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

/**
 * Workflow v2 确定性引擎（CAP-S-03 W1/W2）生命周期 e2e。
 *
 * 覆盖 GAP-T-48 的核心场景：journal 双层账 / human 挂起恢复 / 恢复后 journal
 * 复用不重复执行 / 错误分类（llm 无 provider → provider_deterministic）/
 * agent 节点派发桥 + 事件推进器幂等结算 / 取消。
 */

/** 端到端轮询：引擎 drive 是异步 fire-and-forget，断言前等终态 */
async function waitFor<T>(
  fn: () => Promise<T | undefined>,
  timeoutMs = 8000,
  intervalMs = 150,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error('waitFor timeout');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

describe('Workflow v2 engine (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let messageBus: MessageBusService;
  const dispatchMock = vi.fn();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CliDispatchService)
      .useValue({
        dispatchTaskToCli: dispatchMock,
      } as unknown as Partial<CliDispatchService>)
      // 本套件不含真实 LLM 断言：强制空 provider，llm 节点走 provider_deterministic 快速失败
      .overrideProvider(AdapterRegistryService)
      .useValue({
        listAdapters: () => [],
        getAdapter: () => null,
      } as unknown as Partial<AdapterRegistryService>)
      .compile();
    app = await initTestApp(moduleFixture);
    messageBus = app.get(MessageBusService);

    ws = createIsolatedWorkspace('Workflow v2 e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    const auth = { Authorization: `Bearer ${accessToken}` };

    const projectRes = await wsHttp
      .post('/_api/projects')
      .set(auth)
      .send({
        name: 'v2 引擎 e2e',
        type: 'team',
        visibility: 'private',
      })
      .expect(201);
    projectId = projectRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  const createDefinition = async (key: string, definition: unknown) => {
    const res = await wsHttp
      .post('/_api/workflows')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ key, name: key, definition });
    expect(res.status).toBe(201);
    return res.body.data;
  };

  const getRun = async (runId: string) => {
    const res = await wsHttp
      .get(`/_api/workflow-runs/${runId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    return res.body.data;
  };

  describe('action → human 挂起 → 恢复 → condition 全链', () => {
    const key = 'v2-full-lifecycle';
    let runId = '';

    it('触发后于 human 节点挂起；journal 双层账与文档落库各就各位', async () => {
      await createDefinition(key, {
        version: 2,
        inputHint: { docTitle: 'string', projectId: 'string' },
        nodes: [
          {
            id: 'make-doc',
            type: 'action',
            action: 'document.create',
            params: {
              projectId: '{input.projectId}',
              title: '{input.docTitle}',
              content: 'v2 引擎 e2e 产物',
            },
          },
          { id: 'review', type: 'human', message: '请确认 {input.docTitle}' },
          {
            id: 'gate',
            type: 'condition',
            left: '{steps.review.approved}',
            op: 'eq',
            right: true,
            then: [
              {
                id: 'log-pass',
                type: 'action',
                action: 'document.create',
                params: {
                  projectId: '{input.projectId}',
                  title: '{input.docTitle}-pass',
                  content: '确认通过',
                },
              },
            ],
            else: [],
          },
        ],
      });

      const trigger = await wsHttp
        .post(`/_api/workflows/${key}/run`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          parameters: { docTitle: 'v2 全链产物', projectId },
        });
      expect(trigger.status).toBe(200);
      runId = trigger.body.data.workflowRunId;

      const run = await waitFor(async () => {
        const detail = await getRun(runId);
        return detail.status === 'suspended' ? detail : undefined;
      });
      expect(run.engineVersion).toBe(2);

      // journal 双层账：节点行 + 事件流
      const statuses = Object.fromEntries(
        run.nodeRuns.map((n: { nodeId: string; status: string }) => [
          n.nodeId,
          n.status,
        ]),
      );
      expect(statuses['make-doc']).toBe('succeeded');
      expect(statuses['review']).toBe('waiting');
      const types = run.events.map((e: { type: string }) => e.type);
      expect(types).toContain('run.started');
      expect(types).toContain('node.exited');
      expect(types).toContain('run.suspended');
      expect(run.waitingApproval).toMatchObject({
        nodeId: 'review',
        mode: 'inline',
      });

      // 静态投影（确认卡同源）
      expect(run.graphSummary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'gate', type: 'condition' }),
        ]),
      );

      // 动作真实落库
      const docs = await ws.db.document.findMany({
        where: { title: 'v2 全链产物' },
      });
      expect(docs).toHaveLength(1);
    });

    it('恢复后确定性重走：journal 复用不重复执行，condition 走 then 分支直至完成', async () => {
      const res = await wsHttp
        .post(`/_api/workflow-runs/${runId}/resume`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nodeId: 'review',
          resumeData: { approved: true, note: '通过' },
        });
      expect(res.status).toBe(200);

      const run = await waitFor(async () => {
        const detail = await getRun(runId);
        return detail.status === 'succeeded' ? detail : undefined;
      });

      // 审批数据经插值流入 condition
      expect(run.output.steps.review).toEqual({ approved: true, note: '通过' });
      expect(run.output.steps.gate).toEqual({ met: true, branch: 'then' });
      const types = run.events.map((e: { type: string }) => e.type);
      expect(types).toContain('run.resumed');
      expect(types).toContain('run.completed');

      // journal 复用断言：make-doc 只执行过一次（恢复重走不重复执行）
      const docs = await ws.db.document.findMany({
        where: { title: 'v2 全链产物' },
      });
      expect(docs).toHaveLength(1);
      const passDocs = await ws.db.document.findMany({
        where: { title: 'v2 全链产物-pass' },
      });
      expect(passDocs).toHaveLength(1);
    });
  });

  describe('错误分类：llm 无 provider', () => {
    it('llm 节点失败 → run failed，classification=provider_deterministic', async () => {
      await createDefinition('v2-llm-no-provider', {
        version: 2,
        nodes: [{ id: 'draft', type: 'llm', prompt: '写一句话' }],
      });
      const trigger = await wsHttp
        .post('/_api/workflows/v2-llm-no-provider/run')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      runIdAlias = trigger.body.data.workflowRunId;

      const run = await waitFor(async () => {
        const detail = await getRun(runIdAlias);
        return detail.status === 'failed' ? detail : undefined;
      });
      expect(run.output.error).toContain('LLM provider');
      expect(run.output.classification).toBe('provider_deterministic');
      const failed = run.events.find(
        (e: { type: string }) => e.type === 'node.failed',
      );
      expect(failed).toBeTruthy();
    });
    let runIdAlias = '';
  });

  describe('agent 节点派发桥 + 事件推进器', () => {
    it('agent 节点经 dispatchTaskToCli 派发（goal 形态）→ waiting → 执行完成事件推进结算 → run 完成', async () => {
      dispatchMock.mockResolvedValueOnce({
        executionRunId: 'exec-v2-e2e-1',
        status: 'dispatched',
      });
      await createDefinition('v2-agent-goal', {
        version: 2,
        nodes: [
          {
            id: 'dispatch-impl',
            type: 'agent',
            provider: 'zcode',
            targetMode: 'goal',
            prompt: '修复 {input.docTitle} 的验收缺口',
            issueId: '{input.issueId}',
          },
          {
            id: 'record',
            type: 'action',
            action: 'document.create',
            params: {
              projectId: '{input.projectId}',
              title: '{input.docTitle}-agent-done',
              content: 'agent 结算后落档',
            },
          },
        ],
      });

      const trigger = await wsHttp
        .post('/_api/workflows/v2-agent-goal/run')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          parameters: {
            docTitle: 'v2 agent',
            projectId,
            issueId: 'issue-v2-e2e-1',
          },
        });
      runIdAgent = trigger.body.data.workflowRunId;

      // 派发参数断言：goal 模式 = promptOverride 携带 /goal 前缀
      await waitFor(async () =>
        dispatchMock.mock.calls.length > 0 ? true : undefined,
      );
      const [issueIdArg, , optionsArg] = dispatchMock.mock.calls[0];
      expect(issueIdArg).toBe('issue-v2-e2e-1');
      expect(optionsArg.promptOverride).toBe('/goal 修复 v2 agent 的验收缺口');
      expect(optionsArg.providerId).toBe('zcode');

      // 挂起等待执行完成
      const suspendedRun = await waitFor(async () => {
        const detail = await getRun(runIdAgent);
        return detail.status === 'suspended' ? detail : undefined;
      });
      const agentNode = suspendedRun.nodeRuns.find(
        (n: { nodeId: string }) => n.nodeId === 'dispatch-impl',
      );
      expect(agentNode).toMatchObject({
        status: 'waiting',
        executionRunId: 'exec-v2-e2e-1',
      });

      // 执行域落终态 + 完成事件 → 推进器结算 → run 继续
      await ws.db.execution.create({
        data: {
          id: 'exec-v2-e2e-1',
          projectId,
          subjectType: 'external_agent',
          subjectId: 'agent-v2-e2e',
          identitySource: 'cli',
          goal: 'v2 agent e2e',
          status: 'completed',
          output: { response: '实现完成' },
          completedAt: new Date(),
        },
      });
      messageBus.publish('runtime.execution.result', {
        executionRunId: 'exec-v2-e2e-1',
      });

      const run = await waitFor(async () => {
        const detail = await getRun(runIdAgent);
        return detail.status === 'succeeded' ? detail : undefined;
      });
      expect(run.nodeRuns).toContainEqual(
        expect.objectContaining({
          nodeId: 'dispatch-impl',
          status: 'succeeded',
          executionRunId: 'exec-v2-e2e-1',
        }),
      );
      const doneDocs = await ws.db.document.findMany({
        where: { title: 'v2 agent-agent-done' },
      });
      expect(doneDocs).toHaveLength(1);
    });
    let runIdAgent = '';
  });

  describe('取消', () => {
    it('suspended 运行可取消并落 run.cancelled 事件', async () => {
      await createDefinition('v2-cancel', {
        version: 2,
        nodes: [{ id: 'hold', type: 'human', message: '挂住等取消' }],
      });
      const trigger = await wsHttp
        .post('/_api/workflows/v2-cancel/run')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      const id = trigger.body.data.workflowRunId;
      await waitFor(async () => {
        const detail = await getRun(id);
        return detail.status === 'suspended' ? true : undefined;
      });

      const res = await wsHttp
        .post(`/_api/workflow-runs/${id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.body.data.status).toBe('cancelled');

      const run = await getRun(id);
      expect(run.status).toBe('cancelled');
      expect(run.events.map((e: { type: string }) => e.type)).toContain(
        'run.cancelled',
      );
    });
  });

  describe('跨重启恢复', () => {
    it('boot 恢复扫描对 running 运行重走：journal 复用、waiting 节点重新挂起、无重复执行', async () => {
      // 造「崩溃残留」：把挂起中的运行强行置回 running（模拟 suspend 写库前进程死亡）
      const result = await wsHttp
        .post('/_api/workflows/v2-full-lifecycle/run')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          parameters: { docTitle: 'v2 恢复产物', projectId },
        });
      const runId = result.body.data.workflowRunId;
      await waitFor(async () => {
        const detail = await getRun(runId);
        return detail.status === 'suspended' ? true : undefined;
      });
      await ws.db.aIWorkflowRun.update({
        where: { id: runId },
        data: { status: 'running' },
      });

      // 新引擎实例（等同重启后的 onModuleInit 恢复扫描）
      const engine2 = new WorkflowV2EngineService(
        ws.db as never,
        messageBus,
        app.get(AdapterRegistryService),
        app.get(UsagePricingService),
        { dispatchTaskToCli: dispatchMock } as unknown as CliDispatchService,
      );
      await engine2.onModuleInit();

      const run = await waitFor(async () => {
        const detail = await getRun(runId);
        return detail.status === 'suspended' ? detail : undefined;
      });
      // waiting 节点保持挂起、已完成节点不重复执行
      expect(run.nodeRuns).toContainEqual(
        expect.objectContaining({ nodeId: 'review', status: 'waiting' }),
      );
      const docs = await ws.db.document.findMany({
        where: { title: 'v2 恢复产物' },
      });
      expect(docs).toHaveLength(1);
    });
  });
});
