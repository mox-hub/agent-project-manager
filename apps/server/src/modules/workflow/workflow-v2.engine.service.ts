/**
 * WorkflowV2EngineService（CAP-S-03 W1/W2）——自研确定性执行引擎。
 *
 * 设计（参照 ZCode 动态工作流的七条原则，全部自行实现）：
 * - journal 双层账：WorkflowNodeRun 节点行（准入即 running / 挂起即 waiting，结算一笔写）
 *   + WorkflowEvent 事件流（seq 单调）；运行视图 = 静态图（graphSnapshot）+ 状态叠加
 * - 恢复 = 确定性重走：drive() 从根层重走节点树，已结算节点（succeeded/skipped）直接复用
 *   journal 输出跳过，不重复执行；挂起节点（waiting）再次挂起或被推进器结算
 * - 错误分类：error JSON 携带 classification（node=定义/校验、provider_deterministic=确定性
 *   不可用、transient=网络等瞬态、agent_dispatch=派发门禁拒绝）；节点失败 → run failed，
 *   fan-out 单项失败不拖垮（结果汇总在容器输出里）
 * - 挂起仅在顺序链发生（human/wait/agent），fan-out/loop 子树禁入（文法层已拒绝）
 * - 跨重启恢复：boot 时对 engineVersion=2 且 running 的运行重新 drive；waiting 的 agent
 *   节点由事件推进器按 executionRunId 幂等结算（查询执行项终态，不依赖事件时序）
 *
 * v2.1 已知边界（诚实收窄，见卡片注记）：
 * - human mode=decision-card 运行时降级为 inline 恢复（决策卡 kind 契约接线留 W3）
 * - loop 轮次无跨重启的轮内挂起（挂起型节点本就禁入子树，语义自洽）
 * - 并发治理按单实例假设（AIMD/跨实例租约不在本期）
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { QuickJudgeService } from '../ai-hub/quick-judge/quick-judge.service';
import { Interval } from '@nestjs/schedule';
import { generateText } from 'ai';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  getCurrentWorkspaceId,
  workspaceALS,
} from '../../core/database/workspace-context';
import { listWorkspaces } from '../../core/database/workspace-registry.util';
import {
  MessageBusService,
  type UnsubscribeFn,
} from '../../core/message-bus/message-bus.service';
import { AdapterRegistryService } from '../ai-hub/services/adapter-registry.service';
import { UsagePricingService } from '../ai-hub/services/usage-pricing.service';
import { CliDispatchService } from '../cli-dispatch/dispatch.service';
import { WORKFLOW_ACTIONS } from './workflow-actions';
import {
  evaluateV2Condition,
  interpolateV2Deep,
  interpolateV2Template,
  parseWorkflowDefinitionV2,
  parseScalarV2,
  WorkflowV2DefinitionError,
  type V2InterpolateContext,
  type V2Node,
  type V2WorkflowDoc,
} from './workflow.definition.v2';

export type V2RunStatus =
  'running' | 'suspended' | 'succeeded' | 'failed' | 'cancelled';

type DriveOutcome = 'done' | 'suspended' | 'failed';

type ExecResult =
  | { kind: 'ok' }
  | { kind: 'suspend' }
  | { kind: 'failed'; message: string; classification: string };

interface JournalRow {
  id: string;
  runId: string;
  nodeId: string;
  attempt: number;
  status: string;
  output: unknown;
  error: unknown;
  executionRunId: string | null;
}

interface CtxFrame {
  ctx: V2InterpolateContext;
  /** journal 键后缀链（loop → @r{n}，fan-out → @i{n}），保证轮次/实例维度唯一 */
  suffix: string;
}

@Injectable()
export class WorkflowV2EngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowV2EngineService.name);
  /** 正在 drive 的 run（并发互斥；事件推进器与人工恢复同走 drive 不会双驱动） */
  private readonly driving = new Set<string>();
  private unsubscribers: UnsubscribeFn[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly adapterRegistry: AdapterRegistryService,
    private readonly usagePricing: UsagePricingService,
    private readonly cliDispatch: CliDispatchService,
    private readonly quickJudge: QuickJudgeService,
  ) {}

  onModuleInit() {
    // wait 事件推进器：执行域完成事件 → 按 executionRunId 幂等结算 waiting 节点
    this.unsubscribers.push(
      this.messageBus.subscribe('runtime.execution.result', (payload) =>
        this.onExecutionEvent(payload),
      ),
      this.messageBus.subscribe('execution.completed', (payload) =>
        this.onExecutionEvent(payload),
      ),
    );
    void this.recoverRunningRuns();
  }

  onModuleDestroy() {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  // ── 触发 ──

  async startRun(
    definition: { id: string; key: string },
    rawDefinition: unknown,
    dto: {
      projectId?: string;
      issueId?: string;
      parameters?: Record<string, unknown>;
      triggerType?: string;
    },
    userId: string,
  ): Promise<{ workflowRunId: string; status: V2RunStatus }> {
    let doc: V2WorkflowDoc;
    try {
      doc = parseWorkflowDefinitionV2(rawDefinition);
    } catch (err) {
      throw new WorkflowV2DefinitionError(
        err instanceof WorkflowV2DefinitionError ? err.message : String(err),
      );
    }

    const run = await this.prisma.aIWorkflowRun.create({
      data: {
        workflowId: definition.id,
        projectId: dto.projectId || null,
        issueId: dto.issueId || null,
        triggerType: dto.triggerType || 'manual',
        status: 'running',
        engineVersion: 2,
        input: (dto.parameters ?? {}) as Prisma.InputJsonObject,
        graphSnapshot: doc as unknown as Prisma.InputJsonObject,
        startedAt: new Date(),
        createdBy: userId,
      },
    });

    await this.emitEvent(run.id, 'run.started', {
      workflowKey: definition.key,
      triggerType: run.triggerType,
    });
    this.publishUpdate(run.id, 'running');
    // 引擎异步工作在请求外进行，必须显式携带工作区上下文（数据层按 ALS 路由）
    const workspaceId = getCurrentWorkspaceId();
    void this.withWorkspace(workspaceId, () => this.drive(run.id));
    return { workflowRunId: run.id, status: 'running' };
  }

  /** 在指定工作区上下文中执行（引擎所有请求外异步的统一入口） */
  private withWorkspace<T>(
    workspaceId: string | null,
    fn: () => Promise<T>,
  ): Promise<T> {
    return workspaceALS.run({ workspaceId }, fn);
  }

  // ── 恢复（human 节点 inline 恢复） ──

  async resumeHuman(
    runId: string,
    nodeId: string,
    data: Record<string, unknown>,
    userId: string,
  ): Promise<{ workflowRunId: string; status: V2RunStatus }> {
    const run = await this.prisma.aIWorkflowRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new NotFoundException('Workflow run not found');
    if (run.engineVersion !== 2) {
      throw new Error('该运行不属于 v2 引擎');
    }
    if (run.status !== 'suspended') {
      throw new Error(`仅 suspended 状态的运行可恢复（当前：${run.status}）`);
    }
    const waiting = await this.prisma.workflowNodeRun.findFirst({
      where: { runId, nodeId, status: 'waiting' },
      orderBy: { attempt: 'desc' },
    });
    if (!waiting) throw new NotFoundException(`节点 ${nodeId} 无 waiting 记录`);

    await this.prisma.workflowNodeRun.update({
      where: { id: waiting.id },
      data: {
        status: 'succeeded',
        output: data as Prisma.InputJsonObject,
        finishedAt: new Date(),
      },
    });
    await this.prisma.aIWorkflowRun.update({
      where: { id: runId },
      data: { status: 'running' },
    });
    await this.emitEvent(runId, 'run.resumed', { nodeId, userId });
    this.publishUpdate(runId, 'running');
    const workspaceId = getCurrentWorkspaceId();
    void this.withWorkspace(workspaceId, () => this.drive(runId));
    return { workflowRunId: runId, status: 'running' };
  }

  async cancelRun(
    runId: string,
    userId: string,
  ): Promise<{ workflowRunId: string; status: V2RunStatus }> {
    const run = await this.prisma.aIWorkflowRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new NotFoundException('Workflow run not found');
    if (run.engineVersion !== 2) throw new Error('该运行不属于 v2 引擎');
    if (!['running', 'suspended'].includes(run.status)) {
      throw new Error(`仅 running/suspended 状态可取消（当前：${run.status}）`);
    }
    await this.prisma.aIWorkflowRun.update({
      where: { id: runId },
      data: { status: 'cancelled', finishedAt: new Date() },
    });
    await this.emitEvent(runId, 'run.cancelled', { userId });
    this.publishUpdate(runId, 'cancelled');
    return { workflowRunId: runId, status: 'cancelled' };
  }

  // ── 事件推进器（wait / agent 结算） ──

  private async onExecutionEvent(payload: unknown): Promise<void> {
    const executionRunId = (payload as Record<string, unknown> | null)
      ?.executionRunId;
    if (typeof executionRunId !== 'string' || !executionRunId) return;
    try {
      // 事件不携带工作区事实，按注册表逐工作区定位 waiting 节点（执行项 id 全局唯一）
      for (const record of listWorkspaces()) {
        const waitingNodes = await this.withWorkspace(record.id, () =>
          this.prisma.workflowNodeRun.findMany({
            where: { executionRunId, status: 'waiting' },
          }),
        );
        for (const node of waitingNodes) {
          await this.withWorkspace(record.id, () => this.settleAgentNode(node));
          void this.withWorkspace(record.id, () => this.drive(node.runId));
        }
      }
    } catch (err) {
      this.logger.warn(
        `workflow v2 advancer failed for execution ${executionRunId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** 按 Execution 终态幂等结算 agent/waiting 节点（不依赖事件载荷形状） */
  private async settleAgentNode(node: {
    id: string;
    runId: string;
    nodeId: string;
    executionRunId: string | null;
  }): Promise<boolean> {
    if (!node.executionRunId) return false;
    const execution = await this.prisma.execution.findUnique({
      where: { id: node.executionRunId },
      select: { id: true, status: true, output: true },
    });
    if (!execution) return false;
    // Execution 状态机终态：completed | failed | cancelled（非 succeeded，注意口径）
    const terminal = ['completed', 'failed', 'cancelled'].includes(
      execution.status,
    );
    if (!terminal) return false;

    const succeeded = execution.status === 'completed';
    await this.prisma.workflowNodeRun.update({
      where: { id: node.id },
      data: {
        status: succeeded ? 'succeeded' : 'failed',
        output: (execution.output ?? undefined) as
          Prisma.InputJsonObject | undefined,
        error: succeeded
          ? undefined
          : ({
              code: 'agent_execution_failed',
              message: `执行项 ${execution.status}`,
              classification: 'agent_dispatch',
            } as unknown as Prisma.InputJsonObject),
        finishedAt: new Date(),
      },
    });
    await this.emitEvent(
      node.runId,
      succeeded ? 'node.exited' : 'node.failed',
      {
        nodeId: node.nodeId,
        executionRunId: node.executionRunId,
        status: execution.status,
      },
    );
    return true;
  }

  // ── 驱动循环：确定性重走 ──

  private async drive(runId: string): Promise<void> {
    if (this.driving.has(runId)) return;
    this.driving.add(runId);
    try {
      const run = await this.prisma.aIWorkflowRun.findUnique({
        where: { id: runId },
      });
      if (!run || run.engineVersion !== 2) return;
      if (!['running', 'suspended'].includes(run.status)) return;
      // drive 前把 suspended 归位 running（恢复语义）
      if (run.status === 'suspended') {
        await this.prisma.aIWorkflowRun.update({
          where: { id: runId },
          data: { status: 'running' },
        });
      }

      let doc: V2WorkflowDoc;
      try {
        doc = parseWorkflowDefinitionV2(run.graphSnapshot);
      } catch (err) {
        await this.failRun(
          runId,
          `定义快照非法：${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }

      const journal = await this.loadJournal(runId);
      const ctx: V2InterpolateContext = {
        input: (run.input ?? {}) as Record<string, unknown>,
        steps: buildStepsFromJournal(journal),
      };

      const outcome = await this.execList(doc.nodes, runId, {
        ctx,
        suffix: '',
      });

      if (outcome === 'failed') return; // failRun 已终态化并广播
      if (outcome === 'suspended') {
        await this.prisma.aIWorkflowRun.update({
          where: { id: runId },
          data: { status: 'suspended' },
        });
        this.publishUpdate(runId, 'suspended');
        return;
      }
      await this.prisma.aIWorkflowRun.update({
        where: { id: runId },
        data: {
          status: 'succeeded',
          output: { steps: ctx.steps } as Prisma.InputJsonObject,
          finishedAt: new Date(),
        },
      });
      await this.emitEvent(runId, 'run.completed', {});
      this.publishUpdate(runId, 'succeeded');
      this.logger.log(`Workflow v2 run ${runId} succeeded`);
    } catch (err) {
      await this.failRun(
        runId,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      this.driving.delete(runId);
    }
  }

  private async execList(
    nodes: V2Node[],
    runId: string,
    frame: CtxFrame,
  ): Promise<DriveOutcome> {
    for (const node of nodes) {
      const result = await this.execNode(node, runId, frame);
      if (result.kind === 'suspend') return 'suspended';
      if (result.kind === 'failed') {
        await this.failRun(
          runId,
          result.message,
          result.classification,
          node.id,
        );
        return 'failed'; // run 已由 failRun 终态化，仅用于停止重走
      }
    }
    return 'done';
  }

  private async execNode(
    node: V2Node,
    runId: string,
    frame: CtxFrame,
  ): Promise<ExecResult> {
    const journalKey = node.id + frame.suffix;
    const prior = await this.latestJournalRow(runId, journalKey);

    // journal 复用：已结算节点不重复执行
    if (prior?.status === 'succeeded') {
      frame.ctx.steps[node.id] = prior.output;
      return { kind: 'ok' };
    }
    if (prior?.status === 'skipped') return { kind: 'ok' };
    if (prior?.status === 'failed') {
      // v2.1 无自动重试：节点失败即终止重走（否则推进器事件会造成失败→重派发死循环）
      const err = (prior.error ?? {}) as { message?: string };
      return {
        kind: 'failed',
        message: err.message ?? '节点此前已失败',
        classification: 'node',
      };
    }
    if (prior?.status === 'waiting') {
      // 挂起节点重走：agent 节点先核对执行项终态（推进器事件可能在重启窗口丢失）
      if (node.type === 'agent' && prior.executionRunId) {
        const settled = await this.settleAgentNode(prior);
        if (settled) {
          const fresh = await this.latestJournalRow(runId, journalKey);
          if (fresh?.status === 'succeeded') {
            frame.ctx.steps[node.id] = fresh.output;
            return { kind: 'ok' };
          }
          const err = (fresh?.error ?? {}) as { message?: string };
          return {
            kind: 'failed',
            message: err.message ?? 'agent 执行失败',
            classification: 'agent_dispatch',
          };
        }
      }
      return { kind: 'suspend' };
    }

    const attempt = (prior?.attempt ?? 0) + 1;
    const row = await this.enterNode(runId, journalKey, node, attempt);
    if (!row) return { kind: 'ok' };

    try {
      switch (node.type) {
        case 'llm': {
          const output = await this.runLlmNode(node, frame.ctx, runId);
          await this.settleNode(row.id, 'succeeded', output);
          frame.ctx.steps[node.id] = output;
          return { kind: 'ok' };
        }
        case 'action': {
          const action = WORKFLOW_ACTIONS[node.action];
          if (!action) {
            throw Object.assign(
              new Error(
                `未知产品动作「${node.action}」（节点 ${node.id}），可选值见 GET /workflows/actions`,
              ),
              { classification: 'provider_deterministic' },
            );
          }
          const params = node.params
            ? (interpolateV2Deep(node.params, frame.ctx) as Record<
                string,
                unknown
              >)
            : {};
          const output = await action.execute(this.prisma, params);
          await this.settleNode(row.id, 'succeeded', output);
          frame.ctx.steps[node.id] = output;
          return { kind: 'ok' };
        }
        case 'condition': {
          const leftRaw = interpolateV2Template(node.left, frame.ctx);
          const met = evaluateV2Condition(node.op, leftRaw, node.right);
          const branch = met ? node.then : (node.else ?? []);
          const outcome = await this.execList(branch, runId, {
            ctx: frame.ctx,
            suffix: `${frame.suffix}@${met ? 'then' : 'else'}`,
          });
          if (outcome === 'suspended') return { kind: 'suspend' };
          const output = { met, branch: met ? 'then' : 'else' };
          await this.settleNode(row.id, 'succeeded', output);
          frame.ctx.steps[node.id] = output;
          return { kind: 'ok' };
        }
        case 'human': {
          const message = interpolateV2Template(node.message, frame.ctx);
          await this.prisma.workflowNodeRun.update({
            where: { id: row.id },
            data: {
              status: 'waiting',
              input: {
                mode: node.mode ?? 'inline',
                message,
                ...(node.mode === 'decision-card'
                  ? {
                      degradeNote:
                        'decision-card 契约接线留 W3，本轮以内联恢复结算',
                    }
                  : {}),
              } as Prisma.InputJsonObject,
            },
          });
          await this.emitEvent(runId, 'run.suspended', {
            nodeId: node.id,
            reason: 'human',
            message,
          });
          this.logger.log(
            `Workflow v2 run ${runId} suspended at human node ${node.id}`,
          );
          return { kind: 'suspend' };
        }
        case 'wait': {
          const timeoutMinutes = node.timeoutMinutes ?? 1440;
          await this.prisma.workflowNodeRun.update({
            where: { id: row.id },
            data: {
              status: 'waiting',
              input: {
                event: node.event,
                match: node.match ?? null,
                deadline: new Date(
                  Date.now() + timeoutMinutes * 60_000,
                ).toISOString(),
              } as Prisma.InputJsonObject,
            },
          });
          await this.emitEvent(runId, 'run.suspended', {
            nodeId: node.id,
            reason: 'wait',
            event: node.event,
          });
          return { kind: 'suspend' };
        }
        case 'agent': {
          return await this.execAgentNode(node, runId, row.id, frame);
        }
        case 'fan-out': {
          return await this.execFanOutNode(node, runId, row.id, frame);
        }
        case 'loop': {
          return await this.execLoopNode(node, runId, row.id, frame);
        }
        case 'judge': {
          // CAP-A-27 P2-F：System One 判断节点——毫秒级枚举判断写 steps.<id>
          // 供后续 condition/interpolate 消费。流程控制点 fail-visible：通道
          // 不可用/失败即节点失败（作者可用 condition+llm 自行兜底）。
          const state = interpolateV2Template(node.state, frame.ctx);
          const questions = node.questions.map((q) => ({
            id: q.id,
            type: q.type,
            instructions: interpolateV2Template(q.instructions, frame.ctx),
            ...(q.criteria !== undefined
              ? {
                  criteria: interpolateV2Deep(q.criteria, frame.ctx) as
                    Record<string, string> | string[],
                }
              : {}),
          }));
          const result = await this.quickJudge.judge(
            'workflow_judge',
            state,
            questions,
          );
          if (!result) {
            throw Object.assign(
              new Error(
                `judge 节点 ${node.id}：判断通道不可用（未启用/失败/超时）`,
              ),
              { classification: 'provider_deterministic' },
            );
          }
          const output = { answers: result.answers, model: result.model };
          await this.settleNode(row.id, 'succeeded', output);
          frame.ctx.steps[node.id] = output;
          return { kind: 'ok' };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const classification =
        (err as { classification?: string }).classification ?? 'transient';
      await this.settleNode(row.id, 'failed', undefined, {
        code: 'node_error',
        message,
        classification,
      });
      return { kind: 'failed', message, classification };
    }
  }

  // ── 节点实现 ──

  private async runLlmNode(
    node: Extract<V2Node, { type: 'llm' }>,
    ctx: V2InterpolateContext,
    runId: string,
  ): Promise<{ value: string }> {
    const adapters = this.adapterRegistry.listAdapters();
    if (adapters.length === 0) {
      throw Object.assign(
        new Error('没有可用的 LLM provider，请先在设置中配置并启用后重试'),
        { classification: 'provider_deterministic' },
      );
    }
    const adapter = this.adapterRegistry.getAdapter(adapters[0].provider);
    if (!adapter) {
      throw Object.assign(new Error('LLM 适配器不可用，请重新加载 provider'), {
        classification: 'provider_deterministic',
      });
    }
    const model = adapter.getModel() as Parameters<
      typeof generateText
    >[0]['model'];
    const prompt = interpolateV2Template(node.prompt, ctx);
    const { text, usage } = await generateText({
      model,
      ...(node.system
        ? { system: interpolateV2Template(node.system, ctx) }
        : {}),
      ...(typeof node.temperature === 'number'
        ? { temperature: node.temperature }
        : {}),
      prompt,
    });
    try {
      const usageRecord = (usage ?? {}) as unknown as Record<
        string,
        number | undefined
      >;
      const promptTokens =
        usageRecord.promptTokens ?? usageRecord.inputTokens ?? 0;
      const completionTokens =
        usageRecord.completionTokens ?? usageRecord.outputTokens ?? 0;
      const estimatedCost = await this.usagePricing.estimateCostUsd({
        modelName: adapter.getModelName(),
        provider: adapter.getProvider(),
        promptTokens,
        completionTokens,
      });
      await this.prisma.aIUsageLog.create({
        data: {
          workflowRunId: runId,
          modelName: adapter.getModelName(),
          provider: adapter.getProvider(),
          promptTokens,
          completionTokens,
          totalTokens: usage?.totalTokens ?? promptTokens + completionTokens,
          estimatedCost,
          responseMetadata: { kind: 'workflow-v2', nodeId: node.id },
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write workflow v2 AI usage log: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return { value: text };
  }

  private async execAgentNode(
    node: Extract<V2Node, { type: 'agent' }>,
    runId: string,
    rowId: string,
    frame: CtxFrame,
  ): Promise<ExecResult> {
    const run = await this.prisma.aIWorkflowRun.findUnique({
      where: { id: runId },
      select: { issueId: true, createdBy: true },
    });
    const prompt = interpolateV2Template(node.prompt, frame.ctx);
    const issueIdRaw = node.issueId
      ? interpolateV2Template(node.issueId, frame.ctx).trim()
      : '';
    const issueId = issueIdRaw || run?.issueId;
    if (!issueId) {
      const message = `agent 节点 ${node.id} 缺关联工单（节点 issueId 与运行 issueId 均为空）`;
      await this.settleNode(rowId, 'failed', undefined, {
        code: 'agent_issue_missing',
        message,
        classification: 'provider_deterministic',
      });
      return {
        kind: 'failed',
        message,
        classification: 'provider_deterministic',
      };
    }

    const targetMode = node.targetMode ?? 'prompt';
    // goal 模式（S2 通道 A 亮点）：APM 验收标准喂外部工具目标循环
    const promptOverride = targetMode === 'goal' ? `/goal ${prompt}` : prompt;

    try {
      const result = await this.cliDispatch.dispatchTaskToCli(
        issueId,
        run?.createdBy ?? 'system',
        {
          providerId: node.provider,
          promptOverride,
        },
      );
      if (result.status === 'error') {
        const message = result.error ?? 'agent 派发失败';
        await this.settleNode(rowId, 'failed', undefined, {
          code: 'agent_dispatch_failed',
          message,
          classification: 'agent_dispatch',
        });
        return { kind: 'failed', message, classification: 'agent_dispatch' };
      }
      // pending_approval 也落 waiting：审批流放行后执行完成事件会推进结算
      await this.prisma.workflowNodeRun.update({
        where: { id: rowId },
        data: {
          status: 'waiting',
          executionRunId: result.executionRunId,
          input: {
            provider: node.provider,
            targetMode,
            promptChars: prompt.length,
            dispatchStatus: result.status,
          } as Prisma.InputJsonObject,
        },
      });
      await this.emitEvent(runId, 'run.suspended', {
        nodeId: node.id,
        reason: 'agent',
        executionRunId: result.executionRunId,
        dispatchStatus: result.status,
      });
      this.logger.log(
        `Workflow v2 run ${runId} waiting on agent execution ${result.executionRunId} (${node.provider}/${targetMode})`,
      );
      return { kind: 'suspend' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.settleNode(rowId, 'failed', undefined, {
        code: 'agent_dispatch_failed',
        message,
        classification: 'agent_dispatch',
      });
      return { kind: 'failed', message, classification: 'agent_dispatch' };
    }
  }

  private async execFanOutNode(
    node: Extract<V2Node, { type: 'fan-out' }>,
    runId: string,
    rowId: string,
    frame: CtxFrame,
  ): Promise<ExecResult> {
    const overRaw = interpolateV2Template(node.over, frame.ctx);
    let items: unknown[];
    try {
      const parsed = JSON.parse(overRaw);
      if (!Array.isArray(parsed)) throw new Error('not array');
      items = parsed;
    } catch {
      const message = `fan-out 节点 ${node.id} 的 over 须插值解析为 JSON 数组（得到：${overRaw.slice(0, 80)}）`;
      await this.settleNode(rowId, 'failed', undefined, {
        code: 'fan_out_not_array',
        message,
        classification: 'node',
      });
      return { kind: 'failed', message, classification: 'node' };
    }

    const concurrency = Math.min(Math.max(node.concurrency ?? 4, 1), 16);
    const results: Array<{
      index: number;
      ok: boolean;
      output?: unknown;
      error?: string;
    }> = [];
    let suspended = false;

    const runItem = async (index: number): Promise<void> => {
      if (suspended) return;
      const item = items[index];
      // steps 克隆：并发项各自写入私有副本，互不污染；项输出只进 results 汇总，
      // 不回写全局 steps（跨项同名节点输出以 fan-out 容器输出为准）
      const itemFrame: CtxFrame = {
        ctx: { ...frame.ctx, steps: { ...frame.ctx.steps }, item, index },
        suffix: `${frame.suffix}@i${index}`,
      };
      const outcome = await this.execList(node.children, runId, itemFrame);
      if (outcome === 'suspended') {
        // 文法层禁止子树挂起节点；此分支只可能来自子节点失败终止，防御性记录
        suspended = true;
        return;
      }
      const itemSteps = Object.keys(itemFrame.ctx.steps).length;
      results.push({
        index,
        ok: true,
        output: itemSteps > 0 ? lastAddedStep(itemFrame.ctx.steps) : undefined,
      });
    };

    // 并发池（确定性顺序：按索引分批）
    for (let start = 0; start < items.length; start += concurrency) {
      if (suspended) break;
      const batch = items
        .slice(start, start + concurrency)
        .map((_, offset) => runItem(start + offset));
      await Promise.all(batch);
    }

    if (suspended) return { kind: 'suspend' };

    const output = {
      total: items.length,
      ok: results.filter((r) => r.ok).length,
      results,
    };
    await this.settleNode(rowId, 'succeeded', output);
    frame.ctx.steps[node.id] = output;
    return { kind: 'ok' };
  }

  private async execLoopNode(
    node: Extract<V2Node, { type: 'loop' }>,
    runId: string,
    rowId: string,
    frame: CtxFrame,
  ): Promise<ExecResult> {
    let round = 0;
    for (; round < node.maxRounds; round++) {
      const currentRound = round + 1;
      const outcome = await this.execList(node.children, runId, {
        ctx: { ...frame.ctx, round: currentRound },
        suffix: `${frame.suffix}@r${currentRound}`,
      });
      if (outcome === 'suspended') return { kind: 'suspend' };
      if (node.until) {
        const leftRaw = interpolateV2Template(node.until.left, {
          ...frame.ctx,
          round: currentRound,
        });
        if (evaluateV2Condition(node.until.op, leftRaw, node.until.right))
          break;
      }
    }
    // for 正常耗尽时 round === maxRounds；until 命中 break 时 round = 当前轮-1
    const finalOutput = { rounds: Math.min(round + 1, node.maxRounds) };
    await this.settleNode(rowId, 'succeeded', finalOutput);
    frame.ctx.steps[node.id] = finalOutput;
    return { kind: 'ok' };
  }

  // ── journal 基元 ──

  private async loadJournal(runId: string): Promise<Map<string, JournalRow>> {
    const rows = await this.prisma.workflowNodeRun.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, JournalRow>();
    for (const row of rows) {
      map.set(row.nodeId, {
        id: row.id,
        runId: row.runId,
        nodeId: row.nodeId,
        attempt: row.attempt,
        status: row.status,
        output: row.output,
        error: row.error,
        executionRunId: row.executionRunId,
      });
    }
    return map;
  }

  private async latestJournalRow(
    runId: string,
    journalKey: string,
  ): Promise<JournalRow | null> {
    const row = await this.prisma.workflowNodeRun.findFirst({
      where: { runId, nodeId: journalKey },
      orderBy: { attempt: 'desc' },
    });
    if (!row) return null;
    return {
      id: row.id,
      runId: row.runId,
      nodeId: row.nodeId,
      attempt: row.attempt,
      status: row.status,
      output: row.output,
      error: row.error,
      executionRunId: row.executionRunId,
    };
  }

  /** 准入即写 running；返回 null 表示本次重走应跳过（防御孤儿终态竞争） */
  private async enterNode(
    runId: string,
    journalKey: string,
    node: V2Node,
    attempt: number,
  ) {
    return this.prisma.workflowNodeRun.create({
      data: {
        runId,
        nodeId: journalKey,
        nodeType: node.type,
        attempt,
        status: 'running',
      },
    });
  }

  /** 结算一笔写：行终态 + 节点事件 */
  private async settleNode(
    rowId: string,
    status: 'succeeded' | 'failed' | 'skipped',
    output?: unknown,
    error?: { code: string; message: string; classification: string },
  ) {
    const row = await this.prisma.workflowNodeRun.findUnique({
      where: { id: rowId },
    });
    await this.prisma.workflowNodeRun.update({
      where: { id: rowId },
      data: {
        status,
        ...(output !== undefined
          ? { output: output as Prisma.InputJsonObject }
          : {}),
        ...(error
          ? { error: error as unknown as Prisma.InputJsonObject }
          : { error: Prisma.JsonNull }),
        finishedAt: new Date(),
      },
    });
    if (row) {
      await this.emitEvent(
        row.runId,
        status === 'failed' ? 'node.failed' : 'node.exited',
        {
          nodeId: row.nodeId,
          status,
          ...(error ? { error: error.message } : {}),
        },
      );
    }
  }

  /** run 级失败（错误分类落 output + 事件流） */
  private async failRun(
    runId: string,
    message: string,
    classification = 'run',
    nodeId?: string,
  ) {
    await this.prisma.aIWorkflowRun
      .update({
        where: { id: runId },
        data: {
          status: 'failed',
          output: {
            error: message,
            classification,
            ...(nodeId ? { nodeId } : {}),
          } as Prisma.InputJsonObject,
          finishedAt: new Date(),
        },
      })
      .catch(() => undefined);
    await this.emitEvent(runId, 'run.failed', {
      message,
      classification,
      ...(nodeId ? { nodeId } : {}),
    }).catch(() => undefined);
    this.publishUpdate(runId, 'failed', message);
    this.logger.warn(
      `Workflow v2 run ${runId} failed${nodeId ? ` at ${nodeId}` : ''}: ${message}`,
    );
  }

  private async emitEvent(
    runId: string,
    type: string,
    payload: Record<string, unknown>,
  ) {
    const last = await this.prisma.workflowEvent.findFirst({
      where: { runId },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });
    await this.prisma.workflowEvent.create({
      data: {
        runId,
        seq: (last?.seq ?? 0) + 1,
        type,
        payload: payload as Prisma.InputJsonObject,
      },
    });
  }

  private publishUpdate(runId: string, status: string, error?: string) {
    this.messageBus.publish('ai.workflow.update', {
      workflowRunId: runId,
      engineVersion: 2,
      status,
      ...(error ? { error } : {}),
      at: new Date().toISOString(),
    });
  }

  // ── 启动恢复与超时清扫 ──

  /** W1 出口判据：跨重启恢复——boot 时对 v2 running 运行重走（journal 复用已完成节点） */
  private async recoverRunningRuns(): Promise<void> {
    try {
      for (const record of listWorkspaces()) {
        const stalled = await this.withWorkspace(record.id, () =>
          this.prisma.aIWorkflowRun.findMany({
            where: { engineVersion: 2, status: 'running' },
            select: { id: true },
          }),
        );
        for (const run of stalled) {
          this.logger.log(
            `Workflow v2 run ${run.id} recovered after restart (workspace=${record.id}), re-driving`,
          );
          void this.withWorkspace(record.id, () => this.drive(run.id));
        }
      }
    } catch (err) {
      this.logger.warn(
        `Workflow v2 recovery failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** wait 节点超时清扫（5 分钟一拍）：过 deadline 的 waiting wait 节点置 failed 并重走 */
  @Interval(5 * 60_000)
  async sweepWaitTimeouts(): Promise<void> {
    try {
      for (const record of listWorkspaces()) {
        const deadlineNodes = await this.withWorkspace(record.id, () =>
          this.prisma.workflowNodeRun.findMany({
            where: { status: 'waiting', nodeType: 'wait' },
            include: { run: { select: { id: true, status: true } } },
          }),
        );
        const now = Date.now();
        for (const node of deadlineNodes) {
          const input = (node.input ?? {}) as { deadline?: string };
          if (!input.deadline || new Date(input.deadline).getTime() > now)
            continue;
          if (!['suspended', 'running'].includes(node.run.status)) continue;
          await this.withWorkspace(record.id, () =>
            this.prisma.workflowNodeRun.update({
              where: { id: node.id },
              data: {
                status: 'failed',
                error: {
                  code: 'wait_timeout',
                  message: `等待事件超时（deadline ${input.deadline}）`,
                  classification: 'node',
                } as unknown as Prisma.InputJsonObject,
                finishedAt: new Date(),
              },
            }),
          );
          void this.withWorkspace(record.id, () => this.drive(node.runId));
        }
      }
    } catch (err) {
      this.logger.warn(
        `Workflow v2 wait sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/** journal → steps 上下文（按 createdAt 升序覆盖写入，同 id 多次执行取最近输出） */
function buildStepsFromJournal(
  journal: Map<string, JournalRow>,
): Record<string, unknown> {
  const steps: Record<string, unknown> = {};
  for (const [key, row] of journal) {
    if (row.status !== 'succeeded') continue;
    // journalKey 去掉容器后缀（@r1/@i2/@then）即节点 id
    const plainId = key.split('@')[0];
    steps[plainId] = row.output;
  }
  return steps;
}

function lastAddedStep(steps: Record<string, unknown>): unknown {
  const keys = Object.keys(steps);
  return keys.length > 0 ? steps[keys[keys.length - 1]] : undefined;
}
