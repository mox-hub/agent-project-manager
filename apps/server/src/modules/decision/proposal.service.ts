import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import {
  GATE_PLAYBOOK_TYPE,
  PlaybookGatePayload,
} from '@/modules/playbook/dto/playbook.dto';
import { getStage, nextStageKey } from '@/modules/playbook/playbook.registry';
import {
  parseWorkflowDefinition,
  WorkflowDefinitionError,
} from '@/modules/workflow/workflow.definition';
import { CreateProposalDto, ResolveProposalDto } from './dto/proposal.dto';

/**
 * 建议类决策卡（DecisionProposal）闭环：
 * 创建（AI 工具/MCP/PAT/内置生成器）→ 决策收件箱聚合展示 → resolve 分发到事务化 applier。
 *
 * 决议动作语义：
 * - accept：执行对应 applier（落库副作用），状态置 accepted；
 * - reject：reason 必填，仅留痕，状态置 rejected；
 * - clarify 特例：accept 不产生领域副作用，只落答案（提案方轮询 GET 取回）；
 * - resolution 特例：action=cancel 表示"取消"关闭语义（与 accept=完成 相对）。
 */

type Proposal = Prisma.DecisionProposalGetPayload<Record<string, never>>;

/**
 * 组合件验收标准的溯源标记（ADR-012 / 开放问题 #4）：
 * 由组合件提案（AI 同事代写）落库的 criteria 与人写的 manual 区分，供完整性审计口径。
 */
export const ACCEPTANCE_SOURCE_AI_INTERVIEW = 'ai-generated-from-interview';

interface PlanAcceptance {
  title?: string;
  completionType?: 'pr' | 'test_report' | 'document' | 'artifact';
  criteria: Array<{
    criteriaType?: 'functional' | 'technical';
    content: string;
    category?: string;
    weight?: number;
    severity?: string;
  }>;
}

interface PlanPayload {
  /** 缺省时为组合件语义：added 以顶级任务族落库（projectId 取提案自身） */
  issueId?: string;
  added?: Array<{
    title: string;
    description?: string;
    estimate?: number;
    assigneeMemberId?: string;
    acceptance?: PlanAcceptance;
  }>;
}

interface AssignmentPayload {
  assignments?: Array<{ issueId: string; memberId: string }>;
}

interface ResolutionPayload {
  entityType: string;
  entityId: string;
}

interface SpendPayload {
  periodKey: string;
  budgetType?: 'tokens' | 'usd';
  newValue?: number;
}

@Injectable()
export class ProposalService {
  private readonly logger = new Logger(ProposalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  async create(dto: CreateProposalDto, userId?: string) {
    const proposal = await this.prisma.decisionProposal.create({
      data: {
        kind: dto.kind,
        title: dto.title,
        detail: dto.detail,
        payload: dto.payload as Prisma.InputJsonValue,
        projectId: dto.projectId,
        issueId: dto.issueId,
        proposerType: dto.proposerType ?? 'ai_agent',
        proposerId: dto.proposerId ?? userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: 'pending',
      },
    });
    this.logger.log(`Proposal created: ${proposal.kind} ${proposal.id}`);
    return proposal;
  }

  /** 提案方（AI 工具）轮询取回决议与答案 */
  async get(id: string) {
    const proposal = await this.prisma.decisionProposal.findUnique({
      where: { id },
    });
    if (!proposal) throw new NotFoundException(`Proposal ${id} not found`);
    return proposal;
  }

  async resolve(id: string, dto: ResolveProposalDto, userId: string) {
    const proposal = await this.prisma.decisionProposal.findUnique({
      where: { id },
    });
    if (!proposal) throw new NotFoundException(`Proposal ${id} not found`);
    if (proposal.status !== 'pending') {
      throw new BadRequestException(`Proposal already ${proposal.status}`);
    }
    if (dto.action === 'reject' && !dto.reason?.trim()) {
      throw new BadRequestException('reject reason is required');
    }

    const resolution: Record<string, unknown> = {
      action: dto.action,
      reason: dto.reason,
      answer: dto.answer,
    };

    // 副作用先行（失败即抛，状态不变，卡片仍留在待决列表可重试）
    if (dto.action === 'accept') {
      await this.apply(proposal, dto, userId);
    } else if (dto.action === 'cancel') {
      if (proposal.kind !== 'resolution') {
        throw new BadRequestException(
          'cancel action only applies to resolution proposals',
        );
      }
      await this.applyResolution(proposal, 'cancelled');
    }

    const updated = await this.prisma.decisionProposal.update({
      where: { id },
      data: {
        status: dto.action === 'reject' ? 'rejected' : 'accepted',
        resolution: resolution as Prisma.InputJsonValue,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });
    // gate 驳回留痕（退回率口径；旁路失败不影响决议主流程）
    if (proposal.kind === 'gate' && dto.action === 'reject') {
      await this.recordGateRejected(proposal, dto.reason, userId);
    }
    this.logger.log(
      `Proposal resolved: ${proposal.kind} ${id} -> ${dto.action}`,
    );
    return updated;
  }

  /** 按 kind 分发到事务化 applier */
  private async apply(
    proposal: Proposal,
    dto: ResolveProposalDto,
    userId: string,
  ): Promise<void> {
    switch (proposal.kind) {
      case 'plan':
        return this.applyPlan(proposal);
      case 'assignment':
        return this.applyAssignment(proposal);
      case 'resolution':
        return this.applyResolution(proposal, 'completed');
      case 'spend':
        return this.applySpend(proposal);
      case 'gate':
        return this.applyGate(proposal, dto, userId);
      case 'workflow_def':
        return this.applyWorkflowDef(proposal, userId);
      case 'release':
        return this.applyRelease(proposal, dto, userId);
      case 'clarify':
        // 最小版：答案已随 resolution 落痕，AI 侧轮询消费；无领域副作用
        if (!dto.answer) {
          throw new BadRequestException('clarify resolve requires answer');
        }
        return;
      default:
        throw new BadRequestException(
          `Unknown proposal kind: ${proposal.kind}`,
        );
    }
  }

  /**
   * workflow_def：AI 代写的 workflow 定义落库（CAP-A-11）。
   * create=按 key 新建（version 1，key 冲突即抛）；update=按 key 定位 version+1 升版。
   * 文法在工具侧已前置校验，applier 再校验一次——落库行必须可编译。
   */
  private async applyWorkflowDef(
    proposal: Proposal,
    userId: string,
  ): Promise<void> {
    const payload = (proposal.payload ?? {}) as unknown as {
      mode?: 'create' | 'update';
      key?: string;
      name?: string;
      description?: string;
      definition?: unknown;
    };
    if (
      (payload.mode !== 'create' && payload.mode !== 'update') ||
      !payload.key ||
      !payload.name ||
      !payload.definition
    ) {
      throw new BadRequestException(
        'workflow_def proposal requires { mode, key, name, definition }',
      );
    }
    try {
      parseWorkflowDefinition(payload.definition);
    } catch (err) {
      throw new BadRequestException(
        `definition 文法非法：${err instanceof WorkflowDefinitionError ? err.message : String(err)}`,
      );
    }
    const existing = await this.prisma.aIWorkflowDefinition.findUnique({
      where: { key: payload.key },
    });
    if (payload.mode === 'create') {
      if (existing) {
        throw new BadRequestException(
          `workflow key ${payload.key} 已存在（v${existing.version}），请改用 update 模式`,
        );
      }
      await this.prisma.aIWorkflowDefinition.create({
        data: {
          key: payload.key,
          name: payload.name,
          description: payload.description ?? null,
          definition: payload.definition as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });
      return;
    }
    if (!existing) {
      throw new BadRequestException(
        `workflow key ${payload.key} 不存在，无法 update`,
      );
    }
    await this.prisma.aIWorkflowDefinition.update({
      where: { key: payload.key },
      data: {
        name: payload.name,
        description: payload.description ?? existing.description,
        definition: payload.definition as Prisma.InputJsonValue,
        version: existing.version + 1,
      },
    });
  }

  /**
   * release：发布审批决策卡（CAP-K-03 驱动型发版）。
   * accept = 人确认授权发布 → gated → approved，广播 release.approved
   * 由 ReleasePublishService 异步执行（tag/GitHub Release/CHANGELOG）。
   * reject = 打回 draft。经 prisma 直写（防模块环，对齐 workflow_def 先例），
   * 状态转换校验复用 release-status 纯函数（无 DI 依赖）。
   */
  private async applyRelease(
    proposal: Proposal,
    dto: ResolveProposalDto,
    userId: string,
  ): Promise<void> {
    const payload = (proposal.payload ?? {}) as unknown as {
      releaseId?: string;
    };
    if (!payload.releaseId) {
      throw new BadRequestException('release proposal requires releaseId');
    }
    const release = await this.prisma.release.findUnique({
      where: { id: payload.releaseId },
    });
    if (!release) {
      throw new BadRequestException(`发版不存在: ${payload.releaseId}`);
    }
    if (dto.action === 'reject') {
      if (release.status !== 'gated' && release.status !== 'approved') {
        throw new BadRequestException(
          `发版状态为 ${release.status}，不允许打回（仅 gated/approved 可打回）`,
        );
      }
      await this.prisma.release.update({
        where: { id: release.id },
        data: {
          status: 'draft',
          failureReason: dto.reason ? `审批打回: ${dto.reason}` : '审批打回',
        },
      });
      return;
    }
    // accept：gated → approved，事件驱动自动发布
    if (release.status !== 'gated') {
      throw new BadRequestException(
        `发版状态为 ${release.status}，仅 gated 可批准发布（门禁先过，打回后需重新 submitGate）`,
      );
    }
    await this.prisma.release.update({
      where: { id: release.id },
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
    this.messageBus.publish('release.approved', { releaseId: release.id });
  }

  /**
   * gate：剧本阶段闸门通过 → 游标拨到下一阶段 + 完成事件留痕。
   * 注册表为纯常量跨模块引用（无 DI 依赖）；阶段可跳过的语义在 playbook 模块。
   */
  private async applyGate(
    proposal: Proposal,
    _dto: ResolveProposalDto,
    userId: string,
  ): Promise<void> {
    const payload = (proposal.payload ?? {}) as unknown as PlaybookGatePayload;
    if (payload?.type !== GATE_PLAYBOOK_TYPE || !proposal.projectId) {
      throw new BadRequestException('gate proposal requires playbook payload');
    }
    const stage = getStage(payload.templateKey, payload.stage);
    const next = nextStageKey(payload.templateKey, payload.stage);
    await this.prisma.project.update({
      where: { id: proposal.projectId },
      data: { lifecycleStage: next },
    });
    try {
      await this.prisma.activity.create({
        data: {
          entityType: 'project',
          entityId: proposal.projectId,
          projectId: proposal.projectId,
          actorId: userId,
          type: 'playbook_stage_completed',
          summary: `阶段「${stage?.name ?? payload.stage}」通过闸门`,
          source: 'system',
          metadata: {
            templateKey: payload.templateKey,
            stage: payload.stage,
            documentId: payload.documentId,
            proposalId: proposal.id,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(
        `gate activity record failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** gate 驳回：留 playbook_gate_rejected 事件（剧本健康卡的退回率口径） */
  private async recordGateRejected(
    proposal: Proposal,
    reason: string | undefined,
    userId: string,
  ): Promise<void> {
    try {
      const payload = (proposal.payload ??
        {}) as unknown as PlaybookGatePayload;
      if (payload?.type !== GATE_PLAYBOOK_TYPE || !proposal.projectId) return;
      const stage = getStage(payload.templateKey, payload.stage);
      await this.prisma.activity.create({
        data: {
          entityType: 'project',
          entityId: proposal.projectId,
          projectId: proposal.projectId,
          actorId: userId,
          type: 'playbook_gate_rejected',
          summary: `阶段「${stage?.name ?? payload.stage}」闸门被驳回${reason ? `：${reason}` : ''}`,
          source: 'user',
          metadata: {
            templateKey: payload.templateKey,
            stage: payload.stage,
            proposalId: proposal.id,
            reason,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(
        `gate reject record failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * plan：批量建任务族；分派成员走 IssueAssignee。
   * 组合件扩展（ADR-012）：issueId 缺省时以提案 projectId 建顶级任务族；
   * added[].acceptance 与任务同事务落验收单 + criteria（source 记 AI 代写溯源）。
   */
  private async applyPlan(proposal: Proposal): Promise<void> {
    const payload = (proposal.payload ?? {}) as unknown as PlanPayload;
    const added = payload.added ?? [];
    if (added.length === 0) {
      throw new BadRequestException('plan proposal requires non-empty added');
    }

    let parent: { id: string; projectId: string; type: string | null } | null =
      null;
    if (payload.issueId) {
      const found = await this.prisma.issue.findUnique({
        where: { id: payload.issueId },
      });
      if (!found) {
        throw new BadRequestException(
          `Parent task ${payload.issueId} not found`,
        );
      }
      if (!found.projectId) {
        throw new BadRequestException(
          `Parent task ${payload.issueId} has no project`,
        );
      }
      parent = { id: found.id, projectId: found.projectId, type: found.type };
    } else if (!proposal.projectId) {
      throw new BadRequestException(
        'composite plan proposal requires projectId on the proposal (no parent task given)',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const sub of added) {
        const task = await tx.issue.create({
          data: {
            projectId: parent ? parent.projectId : proposal.projectId,
            parentIssueId: parent ? parent.id : null,
            title: sub.title,
            description: sub.description,
            estimate: sub.estimate,
            status: 'todo',
            priority: 'medium',
            type: parent?.type ?? 'task',
          },
        });
        if (sub.assigneeMemberId) {
          await this.bindAssignee(tx, task.id, sub.assigneeMemberId);
        }
        if (sub.acceptance) {
          await this.createAcceptanceForTask(tx, task, sub.acceptance);
        }
      }
    });
  }

  /**
   * 组合件：任务验收单 + criteria 直写。决策模块不得注入 AcceptanceService
   * （acceptance.module 已依赖 decision.module，反向注入成环），
   * 故与 applyPlan 同构直接走 tx；completionType 缺省 artifact（新任务无 tags 可推断）。
   */
  private async createAcceptanceForTask(
    tx: Prisma.TransactionClient,
    task: { id: string; title: string },
    acceptance: PlanAcceptance,
  ): Promise<void> {
    if (!acceptance.criteria?.length) {
      throw new BadRequestException(
        `acceptance for task "${task.title}" requires non-empty criteria`,
      );
    }
    const record = await tx.acceptance.create({
      data: {
        issueId: task.id,
        status: 'draft',
        title: acceptance.title ?? `验收 - ${task.title}`,
        completionType: acceptance.completionType ?? 'artifact',
      },
    });
    await tx.acceptanceCriteria.createMany({
      data: acceptance.criteria.map((c, i) => ({
        acceptanceId: record.id,
        criteriaType: c.criteriaType ?? 'functional',
        content: c.content,
        category: c.category,
        weight: c.weight ?? 1,
        severity: c.severity ?? 'medium',
        status: 'pending',
        order: i,
        source: ACCEPTANCE_SOURCE_AI_INTERVIEW,
      })),
    });
  }

  /** assignment：批量绑定任务成员（有 userId 的成员同步 Task.assigneeId） */
  private async applyAssignment(proposal: Proposal): Promise<void> {
    const payload = (proposal.payload ?? {}) as AssignmentPayload;
    const assignments = payload.assignments ?? [];
    if (assignments.length === 0) {
      throw new BadRequestException(
        'assignment proposal requires non-empty assignments',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of assignments) {
        await this.bindAssignee(tx, item.issueId, item.memberId);
      }
    });
  }

  /** resolution：任务完成/取消 或 里程碑达成/取消（取消需项目配置了取消终态） */
  private async applyResolution(
    proposal: Proposal,
    outcome: 'completed' | 'cancelled',
  ): Promise<void> {
    const payload = (proposal.payload ?? {}) as unknown as ResolutionPayload;
    if (payload.entityType === 'milestone') {
      await this.prisma.milestone.update({
        where: { id: payload.entityId },
        data: { status: outcome === 'completed' ? 'reached' : 'cancelled' },
      });
      return;
    }
    if (payload.entityType !== 'task') {
      throw new BadRequestException(
        `Unsupported entityType: ${payload.entityType}`,
      );
    }

    const task = await this.prisma.issue.findUnique({
      where: { id: payload.entityId },
    });
    if (!task)
      throw new BadRequestException(`Task ${payload.entityId} not found`);

    const finalStatuses = await this.prisma.statusDefinition.findMany({
      where: {
        type: 'task',
        isFinal: true,
        OR: [{ projectId: task.projectId }, { projectId: null }],
      },
    });
    if (finalStatuses.some((s) => s.key === task.status)) {
      // 已处终态，幂等返回
      return;
    }
    if (outcome === 'completed') {
      const target =
        finalStatuses.find((s) => s.key === 'done') ?? finalStatuses[0];
      if (!target)
        throw new BadRequestException('No final status defined for task');
      await this.prisma.issue.update({
        where: { id: task.id },
        data: { status: target.key },
      });
      return;
    }

    // 取消：显式要求项目配置了含 cancel 语义的终态，找不到即拒绝（宁可不动数据）
    const cancelStatus = finalStatuses.find((s) =>
      s.key.toLowerCase().includes('cancel'),
    );
    if (!cancelStatus) {
      throw new BadRequestException('项目未配置取消终态状态，无法执行取消');
    }
    await this.prisma.issue.update({
      where: { id: task.id },
      data: { status: cancelStatus.key },
    });
  }

  /** spend：把批准的预算写入 Project.config.aiBudget */
  private async applySpend(proposal: Proposal): Promise<void> {
    const payload = (proposal.payload ?? {}) as unknown as SpendPayload;
    const newValue = payload.newValue;
    if (!proposal.projectId || newValue == null || !payload.budgetType) {
      throw new BadRequestException(
        'spend proposal requires projectId, budgetType and newValue',
      );
    }
    const project = await this.prisma.project.findUnique({
      where: { id: proposal.projectId },
      select: { config: true },
    });
    if (!project)
      throw new BadRequestException(`Project ${proposal.projectId} not found`);

    const config = {
      ...((project.config as Record<string, unknown> | undefined) ?? {}),
    };
    const aiBudget = {
      ...((config.aiBudget as Record<string, unknown>) ?? {}),
    };
    if (payload.budgetType === 'tokens') aiBudget.weeklyTokens = newValue;
    else aiBudget.weeklyCostUsd = newValue;
    config.aiBudget = aiBudget;

    await this.prisma.project.update({
      where: { id: proposal.projectId },
      data: { config: config as Prisma.InputJsonValue },
    });
  }

  /** IssueAssignee 绑定 + 可同步 Task.assignee（成员关联了用户时） */
  private async bindAssignee(
    tx: Prisma.TransactionClient,
    issueId: string,
    memberId: string,
  ): Promise<void> {
    const member = await tx.member.findUnique({ where: { id: memberId } });
    if (!member) throw new BadRequestException(`Member ${memberId} not found`);
    await tx.issueAssignee.upsert({
      where: { issueId_memberId: { issueId, memberId } },
      create: { issueId, memberId },
      update: {},
    });
    if (member.userId) {
      await tx.issue.update({
        where: { id: issueId },
        data: { assigneeId: member.userId, assigneeType: 'user' },
      });
    } else {
      await tx.issue.update({
        where: { id: issueId },
        data: { assigneeType: 'ai_agent', aiAgentId: memberId },
      });
    }
  }

  // ─── 内置生成器 ───

  /** 规则版分派提案：未分配任务 → 信任分最高的活跃 AI 成员 */
  async generateAssignment(projectId: string, userId?: string) {
    const [tasks, members] = await Promise.all([
      this.prisma.issue.findMany({
        where: {
          projectId,
          assigneeId: null,
          status: { in: ['todo', 'in_progress'] },
        },
        select: { id: true, title: true },
        take: 20,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.member.findMany({
        where: { type: 'ai_agent', status: 'active' },
        select: { id: true, displayName: true, trustScore: true },
        orderBy: [{ trustScore: 'desc' }],
      }),
    ]);
    if (tasks.length === 0)
      throw new BadRequestException('没有待分派的未分配任务');
    if (members.length === 0)
      throw new BadRequestException('没有可用的 AI 成员');
    await this.ensureNoPending(projectId, 'assignment');

    const top = members[0];
    return this.create(
      {
        kind: 'assignment',
        projectId,
        title: `将 ${tasks.length} 个未分配任务分派给 ${top.displayName}（信任分最高）？`,
        detail: `规则版建议：全部任务分派给信任分最高的 AI 成员（${top.trustScore ?? '—'} 分）。可在驳回时说明原因，未来版本支持逐任务调配。`,
        proposerType: 'system',
        payload: {
          assignments: tasks.map((t) => ({
            issueId: t.id,
            memberId: top.id,
            taskTitle: t.title,
            memberName: top.displayName,
            trustScore: top.trustScore,
          })),
        },
      },
      userId,
    );
  }

  /**
   * 花费阈值检查：执行完成时调用。项目配置了 aiBudget 周预算且已超支时，
   * 生成 spend 提案（同周期去重）。无预算配置即静默返回。
   */
  async checkSpendOnRunComplete(projectId: string): Promise<void> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { config: true },
      });
      const aiBudget = (
        project?.config as {
          aiBudget?: { weeklyTokens?: number; weeklyCostUsd?: number };
        } | null
      )?.aiBudget;
      if (!aiBudget?.weeklyTokens && !aiBudget?.weeklyCostUsd) return;

      const { periodKey, since } = currentIsoWeek();
      const [agg, top] = await Promise.all([
        this.prisma.execution.aggregate({
          where: { projectId, createdAt: { gte: since } },
          _sum: { totalTokens: true, totalCost: true },
        }),
        this.prisma.execution.groupBy({
          by: ['subjectId'],
          where: { projectId, createdAt: { gte: since } },
          _sum: { totalTokens: true },
          orderBy: { _sum: { totalTokens: 'desc' } },
          take: 1,
        }),
      ]);
      const spentTokens = agg._sum.totalTokens ?? 0;
      const spentCostUsd = agg._sum.totalCost ?? 0;
      const overTokens =
        aiBudget.weeklyTokens != null && spentTokens >= aiBudget.weeklyTokens;
      const overCost =
        aiBudget.weeklyCostUsd != null &&
        spentCostUsd >= aiBudget.weeklyCostUsd;
      if (!overTokens && !overCost) return;

      await this.ensureNoPending(projectId, 'spend', periodKey);
      await this.create({
        kind: 'spend',
        projectId,
        title: `本周 AI 消耗已超预算（${spentTokens} tokens / $${spentCostUsd.toFixed(2)}）`,
        detail: '批准将把新预算写入项目配置；驳回则维持原预算并继续观察。',
        proposerType: 'system',
        payload: {
          periodKey,
          spentTokens,
          budgetTokens: aiBudget.weeklyTokens,
          spentCostUsd,
          budgetCostUsd: aiBudget.weeklyCostUsd,
          topConsumer: top[0]?.subjectId ?? null,
          budgetType: overTokens ? 'tokens' : 'usd',
          newValue: overTokens
            ? Math.ceil((spentTokens * 1.2) / 1000) * 1000
            : Math.ceil((spentCostUsd ?? 0) * 1.2),
        },
      });
    } catch (err) {
      // 花费检查是旁路：失败不阻断执行完成主流程
      this.logger.warn(
        `spend check skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** 验收全部通过后的收口提案：任务全部验收通过且未终态 → 提议确认关闭 */
  async proposeTaskResolutionIfReady(issueId: string): Promise<void> {
    try {
      const task = await this.prisma.issue.findUnique({
        where: { id: issueId },
        select: { id: true, title: true, projectId: true, status: true },
      });
      if (!task) return;
      const pendingAcceptances = await this.prisma.acceptance.count({
        where: { issueId, status: { in: ['pending', 'in_review', 'draft'] } },
      });
      if (pendingAcceptances > 0) return;
      const finalCount = await this.prisma.statusDefinition.count({
        where: { type: 'task', isFinal: true, key: task.status },
      });
      if (finalCount > 0) return; // 已处终态
      await this.ensureNoPending(
        task.projectId ?? undefined,
        'resolution',
        undefined,
        issueId,
      );
      await this.create({
        kind: 'resolution',
        projectId: task.projectId ?? undefined,
        issueId: task.id,
        title: `「${task.title}」验收全部通过，确认关闭？`,
        detail: '完成计入交付统计；若应取消请在卡上选择取消语义。',
        proposerType: 'system',
        payload: { entityType: 'task', entityId: task.id },
      });
    } catch (err) {
      this.logger.warn(
        `resolution proposal skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** 同项目同 kind（可带周期/任务）的待决提案去重 */
  private async ensureNoPending(
    projectId: string | undefined,
    kind: string,
    periodKey?: string,
    issueId?: string,
  ): Promise<void> {
    const pendings = await this.prisma.decisionProposal.findMany({
      where: {
        kind,
        status: 'pending',
        ...(projectId ? { projectId } : {}),
        ...(issueId ? { issueId } : {}),
      },
      select: { id: true, payload: true },
    });
    const conflict = pendings.some((p) => {
      const key = (p.payload as { periodKey?: string } | null)?.periodKey;
      return periodKey ? key === periodKey : true;
    });
    if (conflict) {
      throw new BadRequestException('已存在待处理的同类提案');
    }
  }
}

/** ISO 周键（如 2026-W36）与周起始时间 */
export function currentIsoWeek(now = new Date()): {
  periodKey: string;
  since: Date;
} {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1)); // 本周一
  const week = getIsoWeekNumber(now);
  return {
    periodKey: `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`,
    since: d,
  };
}

function getIsoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
