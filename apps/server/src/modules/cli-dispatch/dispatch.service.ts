/**
 * CLI Dispatch Service
 * 任务派发桥：Task → ExecutionRun → CLI
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import type { CreateExecutionRunDto } from '@/modules/execution/execution.service';
import { ACTIVE_EXECUTION_STATUSES } from '@/modules/execution/execution.service';
import { RuntimeService } from '@/modules/runtime/runtime.service';
import { CliExecutorService } from './cli-executor.service';
import { CliProviderRegistry } from './cli-provider.registry';
import {
  CliResolutionService,
  type ResolvedBinding,
} from './cli-resolution.service';
import { ContextBuilderService } from '@/modules/ai-hub/services/context-builder.service';
import {
  TrustService,
  TRUST_DISPATCH_MIN_LEVEL,
  TRUST_TIER_NAMES,
  evaluateAutoDispatchPermission,
} from '@/modules/trust/trust.service';
import { AcceptanceService } from '@/modules/acceptance/acceptance.service';
import {
  buildEnrichmentSection,
  readBudgetFromEnv,
  DEFAULT_DISPATCH_SKILLS_BUDGET_TOKENS,
  DEFAULT_SKILL_CONTENT_MAX_CHARS,
} from '@/modules/ai-hub/services/context-enrichment';
import { TEST_REPORT_ARTIFACT_TYPE } from './adapters/cli-adapter.interface';
import {
  validateTestReport,
  type TestReportPayload,
} from './adapters/test-report.schema';

export interface DispatchOptions {
  /** 目标 AI 成员（Member.id，type=ai_agent）；缺省时以发起用户为执行主体 */
  memberId?: string;
  providerId?: 'claude-code' | 'codex' | 'zcode' | 'opencode';
  model?: string;
  allowedTools?: string[];
  timeout?: number;
  /**
   * 4d-3：绑定既有执行项（Execution.id）。传入时不再新建执行项，
   * 而是复用该执行项（状态须为 draft/planned/failed/blocked）并经既有
   * 状态机流转到 in_progress；缺省时保持原语义：为 issue 现场创建
   * 默认执行项（语法糖：subject 回落 issue.aiAgentId 对应 AI 成员）。
   */
  executionId?: string;
  /**
   * 覆盖默认 prompt 组装（考古等非标准任务包场景）：传入时跳过
   * buildPrompt 直接以该文本作为派发 prompt（角色/团队规则注入由调用方自理）
   */
  promptOverride?: string;
}

export interface DispatchResult {
  executionRunId: string;
  cliSessionId?: string;
  status: 'dispatched' | 'pending_approval' | 'error';
  error?: string;
  /** 两级审计 gate 之"派发黄牌"：活契约审计 red 时警告但不阻断 */
  auditWarning?: string;
}

/** 成员提示词上下文（派发 prompt 注入用） */
interface MemberPromptContext {
  memberName: string;
  personalPrompt: string | null;
  thinkingLevel: string | null;
  teamRules: string[];
}

/** 思考强度 → 派发 prompt 指令（CLI 无关的统一表述，各 CLI 自行映射执行强度） */
const THINKING_LEVEL_INSTRUCTIONS: Record<string, string> = {
  minimal: '以最简推理快速作答，跳过冗长推演',
  low: '低强度思考：只对关键决策做推理',
  medium: '中等强度思考：常规分析与规划',
  high: '高强度思考：深入推演边界情况与风险后再动手',
  max: '最大化思考：全面穷举方案、权衡与测试策略后再给出结论',
};

/**
 * 执行信任评估 criteria（P0-10 量纲修复，2026-09-20）：**统一 0-100 量纲**，
 * 与 TrustService.evaluateExecution 契约一致（等级阈值 40/70、历史/滚动维度
 * 缺省 50、PR 回灌 delta 均为 0-100 口径）。
 * 此前此处传 0-1 值（0.9/0.7…）而 trust 侧按 0-100 加权，一次成功执行的
 * 综合分仅 ≈30，把信任分从基线 50 打到 30、等级降为观察者——执行越多分越低，
 * 与「执行评估驱动信任演进」方向相反。
 */
export const TRUST_CRITERIA_SUCCESS = {
  correctness: 90,
  efficiency: 70,
  safety: 90,
  collaboration: 70,
};

/**
 * 失败评估 criteria（0-100 量纲，与 runtime 路径历史口径 10/20/50/30 一致；
 * 综合分 ≈41 < 基线 50，保证失败评估拉低信任分）。
 * 原进程内 onComplete 失败分支的 0.2/0.7/0.9/0.7 放大后会得出 ≈55 的失败加分，
 * 与其余两处失败口径不一致，一并对齐到此常量。
 */
export const TRUST_CRITERIA_FAILURE = {
  correctness: 10,
  efficiency: 20,
  safety: 50,
  collaboration: 30,
};

/**
 * 信任门禁的成员查询字段（P2-21）：派发链各处取目标 AI 成员时统一带出
 * 信任等级/分数，避免门禁二次查询。
 */
const TRUST_GATE_MEMBER_SELECT = {
  id: true,
  displayName: true,
  type: true,
  status: true,
  trustLevel: true,
  trustScore: true,
};

/** 信任门禁的项目配置键（scope=project；缺省开启，false/'false' 关闭） */
const TRUST_GATE_CONFIG_KEY = 'dispatch.trustGateEnabled';

/** 技能注入开关的项目配置键（scope=project；缺省开启，false/'false' 关闭） */
const SKILLS_CONFIG_KEY = 'dispatch.skillsEnabled';

@Injectable()
export class CliDispatchService {
  private readonly logger = new Logger(CliDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly executionService: ExecutionService,
    private readonly executor: CliExecutorService,
    private readonly registry: CliProviderRegistry,
    private readonly cliResolution: CliResolutionService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly trustService: TrustService,
    private readonly acceptanceService: AcceptanceService,
    private readonly runtimeService: RuntimeService,
  ) {}

  /**
   * Dispatch a task to CLI for AI agent execution.
   * 新建式派发失败时落一条 blocked 执行项留痕（可监控、可从执行项面板重派）；
   * 绑定既有执行项的失败由该项自身状态承载，不另建记录。
   */
  async dispatchTaskToCli(
    issueId: string,
    userId: string,
    options: DispatchOptions = {},
  ): Promise<DispatchResult> {
    try {
      return await this.runDispatch(issueId, userId, options);
    } catch (err) {
      await this.recordDispatchFailure(issueId, userId, options, err as Error);
      throw err;
    }
  }

  /** 派发失败留痕：best-effort，落库失败只告警，不掩盖原始错误 */
  private async recordDispatchFailure(
    issueId: string,
    userId: string,
    options: DispatchOptions,
    error: Error,
  ) {
    try {
      if (options.executionId) return;
      const task = await this.prisma.issue.findUnique({
        where: { id: issueId },
        select: { id: true, projectId: true, title: true, aiAgentId: true },
      });
      // 收件箱任务无项目，无法落执行项（Execution.projectId 必填）
      if (!task?.projectId) return;
      const subjectId = options.memberId ?? task.aiAgentId;
      await this.executionService.createExecutionRun({
        projectId: task.projectId,
        issueId,
        subjectType: subjectId ? 'platform_ai_member' : 'external_agent',
        subjectId: subjectId ?? userId,
        identitySource: 'cli',
        goal: task.title,
        title: task.title,
        status: 'blocked',
        input: {
          dispatchError: error.message,
          failedAt: new Date().toISOString(),
        },
        metadata: { dispatchFailed: true },
        createdBy: userId,
      });
      this.logger.warn(
        `Dispatch failure recorded as blocked execution for task ${issueId}: ${error.message}`,
      );
    } catch (e) {
      this.logger.warn(
        `Failed to record dispatch failure for task ${issueId}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * P2-21 派发信任门禁（CAP-B-07 三级授权）：观察者（trustLevel=1）不可自动派发，
   * 协助者（2）/受托者（3）放行；未评估（trustLevel 缺失/旧五档越界归 null）放行
   * 并在工单时间线记提示。
   * 存量兼容铁律：只拦「明确低于门槛」的成员，等级拿不到绝不拦（fail-open），
   * 避免 P1-7 式「最严口径卡死存量自动派发」。
   * 口径出处：docs/roadmap/experience-report-2026-09-20.md §八第三批 9
   * 「协助者以上才可自动派发」；docs/01-需求/能力清单-v1.md §4.2 CAP-B-07
   * （2026-09-18 三级裁决：观察者/协助者/受托者）；PRD §12 原则 4「渐进放权」。
   * 可用项目配置 dispatch.trustGateEnabled=false 整体关闭（缺省开启）。
   */
  private async assertTrustDispatchGate(
    member:
      | {
          id: string;
          displayName?: string | null;
          type: string;
          trustLevel: number | null;
          trustScore?: number | null;
        }
      | null
      | undefined,
    ctx: { issueId: string; projectId: string; userId: string },
  ): Promise<void> {
    // 非 AI 成员（human/external_agent）无信任档案语义，不适用本门禁
    if (!member || member.type !== 'ai_agent') return;
    if (!(await this.isTrustGateEnabled(ctx.projectId))) return;

    const decision = evaluateAutoDispatchPermission(member.trustLevel);
    if (decision.allowed) {
      // 未评估放行：时间线记一条提示（best-effort，失败不影响派发）
      if (decision.level === null) {
        await this.recordTrustGateNotice(member, ctx);
      }
      return;
    }

    throw new BadRequestException({
      code: 'TRUST_LEVEL_INSUFFICIENT',
      message:
        `AI 成员「${member.displayName || member.id}」当前信任等级为${decision.levelName}（${decision.level} 级），暂不可自动派发执行：` +
        `自动派发需要${TRUST_TIER_NAMES[TRUST_DISPATCH_MIN_LEVEL]}（${TRUST_DISPATCH_MIN_LEVEL} 级）及以上。` +
        `可在「团队」页调高该成员信任等级，或先让其以低风险方式积累执行评估；` +
        `如确需临时放开，可由管理员将项目配置 ${TRUST_GATE_CONFIG_KEY} 设为 false 后重试`,
      details: {
        memberId: member.id,
        memberName: member.displayName ?? null,
        currentLevel: decision.level,
        currentLevelName: decision.levelName,
        requiredLevel: TRUST_DISPATCH_MIN_LEVEL,
        requiredLevelName: TRUST_TIER_NAMES[TRUST_DISPATCH_MIN_LEVEL] ?? null,
        trustScore: member.trustScore ?? null,
        configKey: TRUST_GATE_CONFIG_KEY,
      },
    });
  }

  /** 信任门禁开关：项目配置 dispatch.trustGateEnabled，缺省开启；读取异常按开启处理 */
  private async isTrustGateEnabled(projectId: string): Promise<boolean> {
    try {
      const config = await this.prisma.appConfig.findFirst({
        where: { scope: 'project', projectId, key: TRUST_GATE_CONFIG_KEY },
      });
      if (!config) return true;
      const value = config.value as unknown;
      return value !== false && value !== 'false';
    } catch (e) {
      this.logger.warn(
        `Trust gate config read failed for project ${projectId}: ${(e as Error).message}`,
      );
      return true;
    }
  }

  /** 未评估成员放行时的时间线提示（best-effort，落库失败只告警） */
  private async recordTrustGateNotice(
    member: { id: string; displayName?: string | null },
    ctx: { issueId: string; projectId: string; userId: string },
  ): Promise<void> {
    try {
      await this.prisma.issueActivity.create({
        data: {
          projectId: ctx.projectId,
          issueId: ctx.issueId,
          actorId: ctx.userId,
          type: 'trust_gate',
          summary: `AI 成员「${member.displayName || member.id}」尚未评估信任等级，本次按存量兼容放行自动派发（协助者及以上才可自动派发，评估产生等级后按等级放权）`,
          source: 'system',
        },
      });
    } catch (e) {
      this.logger.warn(
        `Trust gate notice write failed for issue ${ctx.issueId}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * 兜底批 5：失败执行的重新执行——克隆新建一条执行并走既有派发链。
   * 与绑定派发（options.executionId 原地复用）的语义差异：原执行保持
   * failed/blocked 终态留痕（步骤/产物/错误详情不丢），新执行携带
   * retryOfId 血缘与 retryContext（原状态/失败原因），同 issue 的活契约
   * 关联由 createExecutionRun 自动对齐。
   */
  async retryExecution(
    executionRunId: string,
    userId: string,
    diagnosis?: string,
  ): Promise<DispatchResult> {
    const original = await this.prisma.execution.findUnique({
      where: { id: executionRunId },
      include: {
        issue: { select: { id: true, projectId: true, aiAgentId: true } },
      },
    });
    if (!original) {
      throw new NotFoundException(`Execution ${executionRunId} not found`);
    }
    // P1-21：superseded（人工取消）放开为可重新执行。blocked 执行受单活跃
    // 约束（G5）无法直接重试——原执行自身即「活跃」，唯一出口是「先取消再
    // 重新执行」；若取消后不可重试，指路文案就成了死路。原执行保持
    // superseded 终态留痕（步骤/产物/错误详情不丢），新执行携带 retryOfId
    // 血缘，审计链完整；是否存在其他活跃执行仍由下方预检与 G5 把关。
    const RETRYABLE_STATUSES = ['failed', 'blocked', 'superseded'];
    if (!RETRYABLE_STATUSES.includes(original.status)) {
      throw new BadRequestException(
        `执行 ${original.id} 当前状态为 ${original.status}，仅 failed/blocked/superseded 可重新执行`,
      );
    }
    const issueId = original.issueId;
    if (!issueId || !original.issue) {
      throw new BadRequestException(
        `执行 ${original.id} 未关联有效工单，无法重新执行`,
      );
    }

    // P1-21：重试遇活跃执行的指路——单活跃约束下重试必被 createExecutionRun
    // 互斥拒绝，这里提前拦截并给可执行出口；被重试的 blocked 原执行自身仍属
    // 「活跃」（与 execution.service 同一词表），错误须说明这一层，避免
    // 「等待其完成」式死路指引。
    const active = await this.prisma.execution.findFirst({
      where: {
        issueId,
        status: { in: [...ACTIVE_EXECUTION_STATUSES] },
      },
      select: { id: true, title: true, status: true },
    });
    if (active) {
      throw new BadRequestException(
        active.id === original.id
          ? `执行 ${original.id} 自身仍处于活跃状态（${active.status}），不可直接重新执行：` +
              `请先取消它（执行详情「取消执行」动作，或取消接口 POST /_api/ai/execution-runs/${original.id}/cancel），取消后再重新执行`
          : `该工单已存在其他活跃执行「${active.title ?? active.id}」（ID：${active.id}，状态：${active.status}）：` +
              `请先取消它（执行详情「取消执行」动作，或取消接口 POST /_api/ai/execution-runs/${active.id}/cancel），再重新执行 ${original.id}`,
      );
    }

    const originalInput = (original.input as Record<string, unknown>) ?? {};
    const retryInput: Record<string, unknown> = { ...originalInput };
    // dispatchError 是原执行的派发留痕，归档到 retryContext，不进新执行主载荷
    delete retryInput.dispatchError;
    retryInput.retryContext = {
      retryOfId: original.id,
      originalStatus: original.status,
      originalError: original.errorDetail ?? null,
      originalDispatchError: originalInput.dispatchError ?? null,
      // 失败诊断结论随血缘带入新执行（批一 P0 切片 3，裁决 D）：
      // 「按诊断重试」时由前端传入，供下次派发上下文参考
      ...(diagnosis ? { diagnosis } : {}),
      retriedAt: new Date().toISOString(),
      retriedBy: userId,
    };

    const cloned = await this.executionService.createExecutionRun({
      projectId: original.projectId,
      issueId,
      subjectType: original.subjectType as CreateExecutionRunDto['subjectType'],
      subjectId: original.subjectId,
      identitySource:
        original.identitySource as CreateExecutionRunDto['identitySource'],
      goal: original.goal,
      title: original.title ?? undefined,
      description: original.description ?? undefined,
      role: original.role ?? undefined,
      level: original.level ?? undefined,
      estimate: original.estimate ?? undefined,
      order: original.order,
      input: retryInput,
      status: 'planned',
      createdBy: userId,
      metadata: { retriedFrom: original.id },
      // 优先沿用原执行的验收契约关联；原执行未挂契约时由
      // createExecutionRun 自动对齐 issue 活契约（无则创建）
      acceptanceId: original.acceptanceId ?? undefined,
      retryOfId: original.id,
    });
    this.logger.log(
      `Retry execution created: ${cloned.id} (retryOf=${original.id}) for task ${issueId}`,
    );

    try {
      return await this.dispatchTaskToCli(issueId, userId, {
        executionId: cloned.id,
        // 原执行主体是项目 AI 成员时沿用它；external/human 主体走
        // dispatch 既有回落（issue.aiAgentId 或发起人）
        memberId:
          original.subjectType === 'platform_ai_member'
            ? original.subjectId
            : undefined,
      });
    } catch (err) {
      // 派发未成（验收门禁阻断/provider 不可用等）：新执行落 blocked 留痕
      //（与 recordDispatchFailure 同口径的可观测终态），原执行不受影响。
      try {
        await this.executionService.updateExecutionRun(cloned.id, {
          status: 'blocked',
          errorDetail: {
            reason: 'RETRY_DISPATCH_FAILED',
            message: (err as Error).message,
          },
          metadata: { dispatchFailed: true, retriedFrom: original.id },
        });
      } catch (e) {
        this.logger.warn(
          `Failed to mark retry execution ${cloned.id} as blocked: ${(e as Error).message}`,
        );
      }
      throw err;
    }
  }

  private async runDispatch(
    issueId: string,
    userId: string,
    options: DispatchOptions = {},
  ): Promise<DispatchResult> {
    const { providerId, model, allowedTools, timeout, memberId } = options;

    // 1. Fetch task and validate
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    if (!task.projectId) {
      throw new BadRequestException('Task must belong to a project');
    }

    const projectId = task.projectId;

    // 2. 验收门禁（兜底改造批 3，2026-09-15 裁决先按严格要求）：
    // 无活契约或契约 0 条标准均阻断派发——先有标准再干活
    await this.acceptanceService.assertDispatchGate(issueId);

    // 2.5 依赖门禁（需求重审 G4，2026-09-17 裁决 A）：blocks 依赖未达终态
    // 阻断派发——「B 依赖 A」须先完成 A 才可执行 B（此前仅为提示语义）
    await this.assertDependenciesSatisfied(issueId);

    // 2. Get workspace root
    const workspaceRoot = await this.getWorkspaceRoot(projectId);
    if (!workspaceRoot) {
      throw new BadRequestException(
        `项目尚未配置工作区根目录（No workspace root configured for project ${projectId}）。` +
          `请到「项目设置 → Git 与终端 → 工作区」填写本地路径并保存后，再重新派发。`,
      );
    }

    // 3. V3 身份解析：AI 成员 → provider/role 现场解析（不再读 AgentIdentityBinding）
    let resolvedProviderId = providerId;
    let member: {
      id: string;
      displayName: string;
      type: string;
      status: string;
      trustLevel: number | null;
      trustScore: number | null;
    } | null = null;
    let resolved: ResolvedBinding | null = null;

    if (memberId) {
      member = await this.prisma.member.findUnique({
        where: { id: memberId },
        select: TRUST_GATE_MEMBER_SELECT,
      });
      if (
        !member ||
        member.type !== 'ai_agent' ||
        member.status === 'inactive'
      ) {
        throw new BadRequestException(
          `Member ${memberId} is not an available AI agent`,
        );
      }
      resolved = await this.cliResolution.resolveForMember(memberId, projectId);
      // 显式 providerId 入参优先于解析结果
      if (!providerId) {
        resolvedProviderId = resolved.providerId as
          'claude-code' | 'codex' | 'zcode';
      }
    }

    // 4. Default to claude-code if no provider specified
    if (!resolvedProviderId) {
      resolvedProviderId = 'claude-code';
    }

    // 5. Check provider availability
    if (!this.registry.isAvailable(resolvedProviderId)) {
      throw new BadRequestException(
        `Provider ${resolvedProviderId} is not available on this machine`,
      );
    }

    // 6. Build execution context using ContextBuilder
    const context = await this.contextBuilder.buildTaskExecutionContext(
      issueId,
      projectId,
    );

    // 6.5 成员上下文：个人提示词 / 团队规则 / 思考强度；CLI 工具白名单收敛
    const memberContext = await this.buildMemberPromptContext(memberId ?? null);
    let effectiveAllowedTools = allowedTools;
    if (memberId) {
      const granted = await this.getGrantedCliTools(memberId);
      if (granted) {
        effectiveAllowedTools = allowedTools
          ? allowedTools.filter((t) => granted.includes(t))
          : granted;
        if (effectiveAllowedTools.length === 0) {
          throw new BadRequestException(
            '该成员的 CLI 工具白名单未覆盖请求的工具集，无法派发',
          );
        }
      }
    }

    // 6.7 信任门禁（P2-21 · CAP-B-07 三级授权「协助者以上才可自动派发」）：
    // 显式指定的 AI 成员先行检查；回落主体（issue 主负责人）与绑定执行项的
    // AI 主体在各自分支检查。未评估（trustLevel 缺失）放行并记时间线提示，
    // 只拦「明确低于门槛」（观察者）——存量兼容，见 assertTrustDispatchGate。
    if (member) {
      await this.assertTrustDispatchGate(member, {
        issueId,
        projectId,
        userId,
      });
    }

    // 7. Create ExecutionRun —— 传入 executionId 时复用既有执行项（4d-3），否则现场创建
    let executionRun;
    if (options.executionId) {
      const existing = await this.prisma.execution.findUnique({
        where: { id: options.executionId },
      });
      if (!existing) {
        throw new NotFoundException(
          `Execution ${options.executionId} not found`,
        );
      }
      if (existing.issueId !== issueId) {
        throw new BadRequestException(
          `Execution ${existing.id} 不属于 issue ${issueId}`,
        );
      }
      // 绑定派发允许的起始状态（4d-3）：流转到 in_progress 走
      // updateExecutionRun 的既有状态机校验，不允许则 400。
      const DISPATCHABLE_STATUSES = ['draft', 'planned', 'failed', 'blocked'];
      if (!DISPATCHABLE_STATUSES.includes(existing.status)) {
        throw new BadRequestException(
          `执行项 ${existing.id} 当前状态为 ${existing.status}，仅 draft/planned/failed/blocked 可派发`,
        );
      }
      // 绑定派发未显式指定成员时，按既有执行项的 platform_ai_member 主体过信任门禁
      if (!memberId && existing.subjectType === 'platform_ai_member') {
        const subjectMember = await this.prisma.member.findUnique({
          where: { id: existing.subjectId },
          select: TRUST_GATE_MEMBER_SELECT,
        });
        await this.assertTrustDispatchGate(subjectMember, {
          issueId,
          projectId,
          userId,
        });
      }
      executionRun = await this.executionService.updateExecutionRun(
        existing.id,
        {
          status: 'in_progress',
          startedAt: new Date(),
          // goal/input 以派发参数为准：合并既有 input 并覆盖本次派发载荷
          input: {
            ...((existing.input as Record<string, unknown>) ?? {}),
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
            },
            context,
            model,
            allowedTools: effectiveAllowedTools,
          },
        },
      );
    } else {
      // 语法糖：未指定 memberId 时，回落到 issue 主负责人 AI 成员（aiAgentId），
      // 使「issue 级直接派发」也能落到 platform_ai_member 语义的默认执行项。
      let defaultMember = member;
      if (!memberId && task.aiAgentId) {
        const agent = await this.prisma.member.findUnique({
          where: { id: task.aiAgentId },
          select: TRUST_GATE_MEMBER_SELECT,
        });
        if (agent && agent.type === 'ai_agent' && agent.status !== 'inactive') {
          defaultMember = agent;
          // 回落主体同样过信任门禁（观察者不可自动派发）
          await this.assertTrustDispatchGate(agent, {
            issueId,
            projectId,
            userId,
          });
        }
      }
      executionRun = await this.executionService.createExecutionRun({
        projectId,
        issueId,
        subjectType: defaultMember ? 'platform_ai_member' : 'external_agent',
        subjectId: defaultMember?.id ?? userId,
        identitySource: 'cli',
        goal: task.title,
        role: resolved?.executionRole || undefined,
        input: {
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
          },
          context,
          model,
          allowedTools: effectiveAllowedTools,
        },
        createdBy: userId,
      });
    }

    this.logger.log(
      `ExecutionRun created: ${executionRun.id} for task ${issueId}`,
    );

    // 8. Create CliSession
    const runtime = await this.getOrCreateServerRuntime();
    const cliSession = await this.prisma.cliSession.create({
      data: {
        runtimeId: runtime.id,
        providerId: resolvedProviderId,
        workspaceRoot,
        status: 'active',
        metadata: {
          executionRunId: executionRun.id,
          issueId,
          projectId,
        },
      },
    });

    // 9. Create CliExecutionBinding
    await this.prisma.cliExecutionBinding.create({
      data: {
        executionRunId: executionRun.id,
        cliSessionId: cliSession.id,
        runtimeId: runtime.id,
        providerId: resolvedProviderId,
        workspaceRoot,
        status: 'active',
      },
    });

    // 10. Resolve agent role for prompt injection（解析链路已带回 promptHint）
    const agentRole = resolved?.promptHint
      ? {
          name: resolved.roleName ?? resolved.executionRole,
          role: resolved.executionRole,
          promptHint: resolved.promptHint,
        }
      : null;

    // 11. Build CLI input（promptOverride：考古等自定义任务包直接覆盖默认组装，
    // 技能注入同属默认组装，override 时由调用方自理）
    const skillsSection = options.promptOverride
      ? null
      : await this.buildSkillsPromptSection(projectId);
    const prompt =
      options.promptOverride ??
      this.buildPrompt(task, context, agentRole, memberContext, skillsSection);
    const cliInput = {
      workspaceRoot,
      prompt,
      model,
      allowedTools: effectiveAllowedTools,
      timeout: timeout || 600000, // Default 10 minutes
    };

    // 11. 编排：优先派发到在线 runtime 守护进程，否则回退进程内执行（dev）
    const onlineRuntime = await this.findOnlineRuntime();
    if (onlineRuntime) {
      await this.runtimeService.createDispatch(onlineRuntime.runtimeId, {
        executionRunId: executionRun.id,
        projectId,
        issueId,
        subjectType: executionRun.subjectType,
        subjectId: executionRun.subjectId,
        prompt,
        workspaceRoot,
        providerId: resolvedProviderId,
        model,
        allowedTools: effectiveAllowedTools,
        timeout: timeout || 600000,
      });
      this.logger.log(
        `Task ${issueId} dispatched to runtime ${onlineRuntime.runtimeId} (${resolvedProviderId})`,
      );
    } else {
      this.logger.log(
        `No online runtime, executing in-process (dev fallback): ${executionRun.id}`,
      );
      this.executor.execute(
        {
          executionRunId: executionRun.id,
          projectId,
          issueId,
          providerId: resolvedProviderId,
          userId,
        },
        cliInput,
        {
          onComplete: async (result) => {
            // Update cli session status
            await this.prisma.cliSession.update({
              where: { id: cliSession.id },
              data: {
                status: result.status === 'completed' ? 'idle' : 'error',
                lastActiveAt: new Date(),
              },
            });

            // Trigger trust evaluation
            try {
              await this.trustService.evaluateExecution({
                executionRunId: executionRun.id,
                agentId: executionRun.subjectId,
                projectId: executionRun.projectId,
                criteria:
                  result.status === 'completed'
                    ? TRUST_CRITERIA_SUCCESS
                    : TRUST_CRITERIA_FAILURE,
                outcome: result.status === 'completed' ? 'success' : 'failure',
              });
            } catch (e) {
              this.logger.warn(
                `Trust evaluation failed for ${executionRun.id}: ${(e as Error).message}`,
              );
            }

            this.logger.log(
              `CLI execution ${result.status} for ${executionRun.id}`,
            );

            // V3 阶段1: 若 ExecutionRun 关联了 Acceptance，将 result.artifacts 落为 completionEvidence
            await this.persistCompletionEvidence(executionRun.id, result);
          },
          onError: async (error) => {
            await this.prisma.cliSession.update({
              where: { id: cliSession.id },
              data: {
                status: 'error',
                lastActiveAt: new Date(),
                metadata: { lastError: error.message },
              },
            });

            // Trust: failure evaluation on error
            try {
              await this.trustService.evaluateExecution({
                executionRunId: executionRun.id,
                agentId: executionRun.subjectId,
                projectId: executionRun.projectId,
                criteria: TRUST_CRITERIA_FAILURE,
                outcome: 'failure',
              });
            } catch (e) {
              this.logger.warn(
                `Trust evaluation failed for ${executionRun.id}: ${(e as Error).message}`,
              );
            }
          },
        },
      );
    }

    // 12. Publish dispatch event
    this.messageBus.publish('cli.dispatched', {
      executionRunId: executionRun.id,
      issueId,
      projectId,
      providerId: resolvedProviderId,
      cliSessionId: cliSession.id,
    });

    // 13. 派发黄牌：活契约审计 red 时随响应返回警告（不阻断执行）
    let auditWarning: string | undefined;
    if (executionRun.acceptanceId) {
      const report = await this.prisma.completenessAuditReport.findUnique({
        where: { acceptanceId: executionRun.acceptanceId },
        select: { riskLevel: true, blockedItems: true },
      });
      if (report?.riskLevel === 'red') {
        const blocked = (report.blockedItems as unknown[]) ?? [];
        auditWarning = `验收完整性审计存在 ${blocked.length} 个强阻断项，建议补全验收标准（接收时将被红牌拦截）`;
        this.logger.warn(
          `Dispatch yellow-gate: acceptance ${executionRun.acceptanceId} has ${blocked.length} blocked items`,
        );
      }
    }

    return {
      executionRunId: executionRun.id,
      cliSessionId: cliSession.id,
      status: 'dispatched',
      auditWarning,
    };
  }

  /**
   * Cancel a running CLI execution
   * P1-21：取消出口补降级路径——CLI binding 仅在派发成功时创建，blocked
   * （派发被门禁阻断落痕）等从未派发的执行没有 binding，此前直接 404 使
   * 「先取消再重新执行」的指路成为死路。现按两段查找：binding 命中走既有
   * 进程取消链路；binding 缺失时按 executionId 回落为纯执行记录取消（无
   * 进程可杀、无 binding/session 待清理，状态流转仍走 executionService
   * 状态机，终态校验与幂等语义不变）；两段都查不到才 404，并说明查了什么。
   */
  async cancelExecution(
    executionRunId: string,
    userId: string,
  ): Promise<boolean> {
    const binding = await this.prisma.cliExecutionBinding.findFirst({
      where: { executionRunId },
    });

    if (!binding) {
      const run = await this.prisma.execution.findUnique({
        where: { id: executionRunId },
        select: { id: true },
      });
      if (!run) {
        throw new NotFoundException(
          `取消失败：执行 ${executionRunId} 不存在` +
            `（已查 CLI 执行绑定与执行记录两路，均未命中，请确认执行 ID 是否正确）`,
        );
      }
      await this.executionService.cancelExecution(
        executionRunId,
        'Cancelled by user',
      );
      this.messageBus.publish('cli.cancelled', {
        executionRunId,
        cancelledBy: userId,
        viaBinding: false,
      });
      // 无 binding = 无在跑 CLI 进程可杀，返回值与既有语义一致（success=是否杀掉进程）
      return false;
    }

    // Cancel the process
    const cancelled = this.executor.cancel(executionRunId);

    // Update status
    await this.executionService.cancelExecution(
      executionRunId,
      'Cancelled by user',
    );

    // Update bindings
    await this.prisma.cliExecutionBinding.updateMany({
      where: { executionRunId },
      data: { status: 'terminated' },
    });

    await this.prisma.cliSession.update({
      where: { id: binding.cliSessionId },
      data: {
        status: 'terminated',
        endedAt: new Date(),
      },
    });

    this.messageBus.publish('cli.cancelled', {
      executionRunId,
      cancelledBy: userId,
    });

    return cancelled;
  }

  /**
   * 查找最近的在线 runtime（守护进程）。无在线 runtime 时返回 null（回退进程内执行）。
   */
  private async findOnlineRuntime(): Promise<{ runtimeId: string } | null> {
    const records = await this.prisma.appConfig.findMany({
      where: { scope: 'runtime.registration' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    const online = records
      .map(
        (r) =>
          r.value as {
            runtimeId: string;
            status?: string;
            lastSeenAt?: string;
          },
      )
      .filter((r) => r.status === 'online')
      .sort((a, b) =>
        (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''),
      )[0];
    return online ? { runtimeId: online.runtimeId } : null;
  }

  /**
   * 守护进程上报执行结果（runtime.execution.result）→ 桥接：
   * ExecutionRun 状态更新 + cliSession 状态 + 信任评估 + 验收证据落库。
   */
  /**
   * 守护进程 execution.started 事件 → 执行项 planned→in_progress。
   * runtime 路径没有进程内执行器那样的 startExecution 时机，
   * 不补这一步结果落地时会被状态机禁跳步拒收（planned→completed）。
   */
  @OnEvent('runtime.execution.event')
  async onRuntimeExecutionEvent(payload: {
    eventType?: string;
    executionRunId?: string;
  }): Promise<void> {
    if (payload?.eventType !== 'execution.started' || !payload.executionRunId) {
      return;
    }
    try {
      await this.executionService.startExecution(payload.executionRunId);
    } catch (e) {
      this.logger.warn(
        `Failed to mark ${payload.executionRunId} in_progress: ${(e as Error).message}`,
      );
    }
  }

  @OnEvent('runtime.execution.result')
  async onRuntimeExecutionResult(payload: {
    executionRunId: string;
    status: string;
    summary?: string;
    artifacts?: Array<{ type: string; ref: string }>;
    evidence?: Array<{ type: string; ref: string }>;
    error?: Record<string, unknown> | null;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      costUsd?: number;
      model?: string;
    } | null;
    output?: Record<string, unknown> | null;
  }): Promise<void> {
    const {
      executionRunId,
      status,
      summary,
      artifacts = [],
      error,
      usage,
    } = payload;
    try {
      const run = await this.prisma.execution.findUnique({
        where: { id: executionRunId },
      });
      if (!run) {
        this.logger.warn(
          `runtime result for unknown run ${executionRunId}, skipped`,
        );
        return;
      }

      // 兜底：started 事件缺失/乱序时先补 in_progress，避免终态被状态机拒收
      if (
        run.status !== 'in_progress' &&
        !['completed', 'superseded'].includes(run.status)
      ) {
        try {
          await this.executionService.startExecution(executionRunId);
        } catch (e) {
          this.logger.warn(
            `Failed to backfill in_progress for ${executionRunId}: ${(e as Error).message}`,
          );
        }
      }

      const completed = status === 'completed';
      const result = {
        status: completed ? ('completed' as const) : ('failed' as const),
        // daemon 上报的结构化输出优先（adapter parseFinalResult 产物），缺省回落 summary
        output: payload.output ?? { summary },
        artifacts: artifacts.map((a) => ({
          type: a.type,
          name: a.ref,
          storageRef: a.ref,
        })),
        error: error ?? undefined,
      };

      // 1) 更新 ExecutionRun
      if (completed) {
        await this.executionService.completeExecution(
          executionRunId,
          result.output,
          result.artifacts.map((a) => ({
            artifactType: a.type,
            name: a.name,
          })),
        );
      } else {
        await this.executionService.failExecution(executionRunId, {
          error: result.error,
          summary,
        });
      }

      // 2) 更新 cliSession 状态
      const cliBinding = await this.prisma.cliExecutionBinding.findFirst({
        where: { executionRunId },
      });
      if (cliBinding) {
        await this.prisma.cliSession.update({
          where: { id: cliBinding.cliSessionId },
          data: {
            status: completed ? 'idle' : 'error',
            lastActiveAt: new Date(),
          },
        });
      }

      // 3) 信任评估
      try {
        await this.trustService.evaluateExecution({
          executionRunId,
          agentId: run.subjectId,
          projectId: run.projectId,
          criteria: completed ? TRUST_CRITERIA_SUCCESS : TRUST_CRITERIA_FAILURE,
          outcome: completed ? 'success' : 'failure',
        });
      } catch (e) {
        this.logger.warn(
          `Trust evaluation failed for ${executionRunId}: ${(e as Error).message}`,
        );
      }

      // 4) 验收证据落库
      await this.persistCompletionEvidence(executionRunId, result);

      // 5) 终事件落时间线：completed/failed 成为事件流最后一条（含 usage 快照）
      try {
        await this.prisma.systemEvent.create({
          data: {
            level: completed ? 'info' : 'error',
            category: 'runtime.execution.event',
            message: `${completed ? 'execution.completed' : 'execution.failed'} (${executionRunId})`,
            context: {
              executionRunId,
              eventType: completed ? 'execution.completed' : 'execution.failed',
              summary: summary ?? (completed ? '任务执行完成' : '任务执行失败'),
              detail: { usage: usage ?? null, error: error ?? null },
              timestamp: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      } catch (e) {
        this.logger.warn(
          `Failed to persist terminal event for ${executionRunId}: ${(e as Error).message}`,
        );
      }

      this.logger.log(
        `Runtime execution ${completed ? 'completed' : 'failed'} for ${executionRunId}`,
      );
    } catch (e) {
      this.logger.warn(
        `onRuntimeExecutionResult failed for ${executionRunId}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * 依赖门禁（需求重审 G4，2026-09-17 裁决 A）：仅 type='blocks' 的依赖参与
   * 派发拦截；依赖达成 = 依赖工单状态为终态（StatusDefinition.isFinal，与
   * issue.service 关单守卫同一口径，不硬编码状态名；定义缺失时无法断言
   * 未达终态，放行）。relates 型依赖仅进上下文提示，不拦执行。
   */
  private async assertDependenciesSatisfied(issueId: string): Promise<void> {
    const deps = await this.prisma.issueDependency.findMany({
      where: { issueId, type: 'blocks' },
      select: {
        dependsOnIssue: {
          select: { id: true, title: true, status: true, projectId: true },
        },
      },
    });
    if (deps.length === 0) return;

    const blockers: string[] = [];
    for (const dep of deps) {
      const depIssue = dep.dependsOnIssue;
      if (!depIssue) continue;
      const statusDef = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          key: depIssue.status,
          OR: [{ projectId: depIssue.projectId }, { projectId: null }],
        },
        select: { isFinal: true },
      });
      if (statusDef && !statusDef.isFinal) {
        blockers.push(`「${depIssue.title}」（状态：${depIssue.status}）`);
      }
    }
    if (blockers.length > 0) {
      throw new BadRequestException(
        `该工单存在未完成的 blocks 依赖，暂不可派发执行：${blockers.join('、')}。请先完成依赖工单，或调整依赖关系后再派发`,
      );
    }
  }

  /**
   * Get workspace root for a project
   */
  private async getWorkspaceRoot(projectId: string): Promise<string | null> {
    // Try ProjectWorkspace first
    const workspace = await this.prisma.projectWorkspace.findUnique({
      where: { projectId },
    });

    if (workspace?.localPath) {
      return workspace.localPath;
    }

    // Try AppConfig
    const config = await this.prisma.appConfig.findFirst({
      where: {
        scope: 'project',
        projectId,
        key: 'git.workspaceRoot',
      },
    });

    if (config) {
      return (config.value as { path?: string })?.path || null;
    }

    // Fallback: try to find from Repository
    const repo = await this.prisma.repository.findFirst({
      where: { projectId },
    });

    return repo?.localPath || null;
  }

  /**
   * Get or create server runtime
   */
  private async getOrCreateServerRuntime() {
    let runtime = await this.prisma.runtime.findFirst({
      where: {
        userId: 'system',
        deviceId: 'server-local',
      },
    });

    if (!runtime) {
      runtime = await this.prisma.runtime.create({
        data: {
          userId: 'system',
          deviceId: 'server-local',
          displayName: 'Server Local CLI',
          hostPlatform: process.platform,
          runtimeVersion: process.version,
          status: 'online',
          lastSeenAt: new Date(),
        },
      });
    }

    return runtime;
  }

  /**
   * Persist execution artifacts as completionEvidence on linked Acceptance.
   * - test_report artifacts → evidence.report
   * - all artifacts → evidence.artifacts (id + name + type)
   */
  private async persistCompletionEvidence(
    executionRunId: string,
    result: {
      status: string;
      artifacts?: Array<{
        type: string;
        name: string;
        content?: string;
        storageRef?: string;
        metadata?: Record<string, unknown>;
      }>;
    },
  ): Promise<void> {
    try {
      const run = await this.prisma.execution.findUnique({
        where: { id: executionRunId },
        select: { acceptanceId: true },
      });
      if (!run?.acceptanceId) return; // 未关联 Acceptance，跳过

      const artifacts = result.artifacts ?? [];
      const evidence: Record<string, unknown> = {
        executionRunId,
        capturedAt: new Date().toISOString(),
        artifacts: artifacts.map((a) => ({
          id: a.storageRef, // storageRef is the canonical ID
          name: a.name,
          type: a.type,
          metadata: a.metadata,
        })),
      };

      // 若是 test_report artifact，把它的 metadata 当成 report
      const testReportArtifact = artifacts.find(
        (a) => a.type === TEST_REPORT_ARTIFACT_TYPE,
      );
      if (testReportArtifact?.metadata) {
        evidence.report = testReportArtifact.metadata;
      }

      // CI 自动判定（最小版）：test_report 校验通过时记录 autoChecks，
      // 供接收校验与前端展示；不自动改写 criteria（判定仍以人工为主）
      if (testReportArtifact?.metadata) {
        const v = validateTestReport(testReportArtifact.metadata);
        if (v.valid) {
          const r: TestReportPayload = v.report;
          const errored = r.errored ?? 0;
          evidence.autoChecks = {
            kind: 'test_report',
            valid: r.failed === 0 && errored === 0,
            passed: r.passed,
            failed: r.failed,
            errored,
            total: r.total,
            checkedAt: new Date().toISOString(),
          };
        }
      }

      // 不覆盖已有 evidence，除非是同一 executionRunId 重跑
      const existing = await this.prisma.acceptance.findUnique({
        where: { id: run.acceptanceId },
        select: { completionEvidence: true },
      });
      const existingEv = existing?.completionEvidence as Record<
        string,
        unknown
      > | null;
      if (existingEv && existingEv.executionRunId !== executionRunId) {
        // 先前的 evidence 来自不同 run，保留为历史
        evidence.previousEvidence = existingEv;
      }

      await this.prisma.acceptance.update({
        where: { id: run.acceptanceId },
        data: { completionEvidence: evidence as any },
      });

      // 同时把 acceptance 推入 in_review（等待人工接收/驳回）
      await this.prisma.acceptance.update({
        where: { id: run.acceptanceId },
        data: { status: 'in_review' },
      });

      this.logger.log(
        `Persisted completion evidence for acceptance ${run.acceptanceId} (${artifacts.length} artifacts)`,
      );
    } catch (e) {
      this.logger.warn(
        `persistCompletionEvidence failed for ${executionRunId}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Build prompt for CLI execution
   */
  private buildPrompt(
    task: { title: string; description?: string | null },
    context: unknown,
    agentRole?: { name: string; role: string; promptHint: string } | null,
    memberContext?: MemberPromptContext | null,
    skillsSection?: string | null,
  ): string {
    const parts: string[] = [];

    // 1. Role block (injected first so it sets context before task details)
    if (agentRole) {
      parts.push(`## Your Role\n${agentRole.promptHint}`);
    }

    // 1.5 Team rules + member personal instructions + reasoning effort
    if (memberContext?.teamRules?.length) {
      parts.push(`## Team Rules\n${memberContext.teamRules.join('\n\n')}`);
    }
    if (memberContext?.personalPrompt?.trim()) {
      parts.push(
        `## Member Instructions (${memberContext.memberName})\n${memberContext.personalPrompt.trim()}`,
      );
    }
    if (memberContext?.thinkingLevel) {
      const instruction =
        THINKING_LEVEL_INSTRUCTIONS[memberContext.thinkingLevel] ??
        memberContext.thinkingLevel;
      parts.push(
        `## Reasoning Effort\n${memberContext.thinkingLevel} — ${instruction}`,
      );
    }

    // 1.7 项目技能段（P2-23）：启用技能的名称+内容摘要，受 token 预算约束；
    // 无技能/开关关闭/数据源失败时不注入空段落
    if (skillsSection?.trim()) {
      parts.push(skillsSection.trim());
    }

    // 2. Task
    parts.push(`# Task\n${task.title}`);
    if (task.description) {
      parts.push(`\n## Description\n${task.description}`);
    }

    // 3. Context
    if (context) {
      parts.push(`\n## Context\n${JSON.stringify(context, null, 2)}`);
    }

    parts.push('\n\nPlease execute this task and report the results.');

    return parts.join('\n');
  }

  /**
   * 项目技能段组装（P2-23）：把启用技能（名称 + 内容摘要）注入派发 prompt
   * 的独立段落。技能注册表（SkillConfig）是全局级（无项目维度），「该项目的
   * 启用技能」实际为全局启用技能——如实按全局口径注入。
   * 铁律：无启用技能 / 开关关闭 / 数据源读取失败一律返回 null，不注空段落；
   * 多技能按序全部参与但整段受 token 预算约束（字符/4 粗估，超限截断并在
   * 段内如实标注）。开关沿用 dispatch.trustGateEnabled 的项目配置先例：
   * dispatch.skillsEnabled，缺省开启。
   */
  private async buildSkillsPromptSection(
    projectId: string,
  ): Promise<string | null> {
    if (!(await this.isSkillsInjectionEnabled(projectId))) return null;

    let skills: Array<{
      key: string;
      name: string;
      description: string | null;
      content: string | null;
    }>;
    try {
      skills = await this.prisma.skillConfig.findMany({
        where: { enabled: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: { key: true, name: true, description: true, content: true },
      });
    } catch (e) {
      this.logger.warn(
        `Skills section read failed for project ${projectId}: ${(e as Error).message}`,
      );
      return null;
    }
    if (!skills || skills.length === 0) return null;

    const maxChars = readBudgetFromEnv(
      'DISPATCH_SKILL_MAX_CHARS',
      DEFAULT_SKILL_CONTENT_MAX_CHARS,
    );
    const budgetTokens = readBudgetFromEnv(
      'DISPATCH_SKILLS_BUDGET_TOKENS',
      DEFAULT_DISPATCH_SKILLS_BUDGET_TOKENS,
    );

    const sources = skills
      .map((s, i) => {
        const body = (s.content?.trim() || s.description || '').trim();
        const summary =
          body.length > maxChars ? `${body.slice(0, maxChars)}…` : body;
        return {
          key: s.key,
          title: `### ${s.name}`,
          text: summary,
          priority: i,
        };
      })
      .filter((s) => s.text);
    if (sources.length === 0) return null;

    const section = buildEnrichmentSection(sources, budgetTokens);
    if (!section.text) return null;

    return [
      '## Project Skills',
      '以下是已启用的项目技能，执行任务时遵循相关技能的方法与约束：',
      '',
      section.text,
    ].join('\n');
  }

  /** 技能注入开关：项目配置 dispatch.skillsEnabled，缺省开启；读取异常按开启处理 */
  private async isSkillsInjectionEnabled(projectId: string): Promise<boolean> {
    try {
      const config = await this.prisma.appConfig.findFirst({
        where: { scope: 'project', projectId, key: SKILLS_CONFIG_KEY },
      });
      if (!config) return true;
      const value = config.value as unknown;
      return value !== false && value !== 'false';
    } catch (e) {
      this.logger.warn(
        `Skills injection config read failed for project ${projectId}: ${(e as Error).message}`,
      );
      return true;
    }
  }

  /**
   * 成员提示词上下文：按 memberId 聚合个人提示词/团队规则/思考强度
   * 个人提示词、思考强度与所在活跃团队的团队规则。
   */
  private async buildMemberPromptContext(
    memberId: string | null,
  ): Promise<MemberPromptContext | null> {
    if (!memberId) return null;
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) return null;

    const teamMembers = await this.prisma.teamMember.findMany({
      where: { memberId: member.id },
      select: { teamId: true },
    });
    const teamIds = teamMembers.map((t) => t.teamId);
    const teams = await (teamIds.length
      ? this.prisma.team.findMany({
          where: { id: { in: teamIds }, status: 'active' },
          select: { teamPrompt: true },
        })
      : Promise.resolve([]));
    const teamRules = [
      ...new Set(
        teams
          .map((t) => t.teamPrompt)
          .filter((p): p is string => Boolean(p && p.trim())),
      ),
    ];

    return {
      memberName: member.displayName,
      personalPrompt: member.personalPrompt,
      thinkingLevel: member.thinkingLevel,
      teamRules,
    };
  }

  /**
   * 成员 CLI 工具白名单（MemberToolGrant scope=cli_tool）。
   * 返回 null 表示未配置授权（不限制）；数组为空表示全部被拒绝。
   */
  private async getGrantedCliTools(memberId: string): Promise<string[] | null> {
    const rows = await this.prisma.memberToolGrant.findMany({
      where: { memberId, scope: 'cli_tool' },
    });
    if (rows.length === 0) return null;
    return rows.filter((r) => r.granted).map((r) => r.refKey);
  }
}
