import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
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

interface PlanPayload {
  taskId: string;
  added?: Array<{
    title: string;
    description?: string;
    estimate?: number;
    assigneeMemberId?: string;
  }>;
}

interface AssignmentPayload {
  assignments?: Array<{ taskId: string; memberId: string }>;
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

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProposalDto, userId?: string) {
    const proposal = await this.prisma.decisionProposal.create({
      data: {
        kind: dto.kind,
        title: dto.title,
        detail: dto.detail,
        payload: dto.payload as Prisma.InputJsonValue,
        projectId: dto.projectId,
        taskId: dto.taskId,
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
      await this.apply(proposal, dto);
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
    this.logger.log(
      `Proposal resolved: ${proposal.kind} ${id} -> ${dto.action}`,
    );
    return updated;
  }

  /** 按 kind 分发到事务化 applier */
  private async apply(
    proposal: Proposal,
    dto: ResolveProposalDto,
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

  /** plan：父任务下批量创建子任务；分派成员走 IssueAssignee */
  private async applyPlan(proposal: Proposal): Promise<void> {
    const payload = (proposal.payload ?? {}) as unknown as PlanPayload;
    const added = payload.added ?? [];
    if (!payload.taskId || added.length === 0) {
      throw new BadRequestException(
        'plan proposal requires taskId and non-empty added',
      );
    }
    const parent = await this.prisma.issue.findUnique({
      where: { id: payload.taskId },
    });
    if (!parent)
      throw new BadRequestException(`Parent task ${payload.taskId} not found`);

    await this.prisma.$transaction(async (tx) => {
      for (const sub of added) {
        const task = await tx.issue.create({
          data: {
            projectId: parent.projectId,
            parentTaskId: parent.id,
            title: sub.title,
            description: sub.description,
            estimate: sub.estimate,
            status: 'todo',
            priority: 'medium',
            type: parent.type ?? 'task',
          },
        });
        if (sub.assigneeMemberId) {
          await this.bindAssignee(tx, task.id, sub.assigneeMemberId);
        }
      }
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
        await this.bindAssignee(tx, item.taskId, item.memberId);
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
    taskId: string,
    memberId: string,
  ): Promise<void> {
    const member = await tx.member.findUnique({ where: { id: memberId } });
    if (!member) throw new BadRequestException(`Member ${memberId} not found`);
    await tx.issueAssignee.upsert({
      where: { taskId_memberId: { taskId, memberId } },
      create: { taskId, memberId },
      update: {},
    });
    if (member.userId) {
      await tx.issue.update({
        where: { id: taskId },
        data: { assigneeId: member.userId, assigneeType: 'user' },
      });
    } else {
      await tx.issue.update({
        where: { id: taskId },
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
            taskId: t.id,
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
        this.prisma.executionRun.aggregate({
          where: { projectId, createdAt: { gte: since } },
          _sum: { totalTokens: true, totalCost: true },
        }),
        this.prisma.executionRun.groupBy({
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
  async proposeTaskResolutionIfReady(taskId: string): Promise<void> {
    try {
      const task = await this.prisma.issue.findUnique({
        where: { id: taskId },
        select: { id: true, title: true, projectId: true, status: true },
      });
      if (!task) return;
      const pendingAcceptances = await this.prisma.acceptance.count({
        where: { taskId, status: { in: ['pending', 'in_review', 'draft'] } },
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
        taskId,
      );
      await this.create({
        kind: 'resolution',
        projectId: task.projectId ?? undefined,
        taskId: task.id,
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
    taskId?: string,
  ): Promise<void> {
    const pendings = await this.prisma.decisionProposal.findMany({
      where: {
        kind,
        status: 'pending',
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {}),
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
