import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { currentIsoWeek } from '@/modules/decision/proposal.service';
import { PROVISIONAL_CAPACITY_PER_MEMBER } from '@/modules/dashboard/dashboard.service';
import {
  OfficeCapacityDto,
  OfficeColleagueDto,
  OfficeCurrentRunDto,
  OfficeSummaryDto,
} from './dto/office.dto';

/**
 * 办公室页聚合：按 AI 成员派生员工卡四件事——
 * 在干什么 / 忙不忙 / 压着多少待决 / 还能接多少活。
 * 真相全部来自既有表（ExecutionRun / ApprovalRequest / Acceptance /
 * DecisionProposal / AIConversation / runtime.dispatch 记录），这里只做归因与派生。
 */

/** 与 decision.service.listPending 相同的单源拉取上限 */
const MAX_PULL = 200;
/** 在途执行状态（与 execution.service.getActiveExecutions 同口径） */
const ACTIVE_RUN_STATUSES = ['planned', 'in_progress', 'pending_approval'];
/** 在途派发状态（runtime.dispatch 记录 value.status） */
const ACTIVE_DISPATCH_STATUSES = new Set(['pending', 'running']);

type ColleagueStatus = OfficeColleagueDto['status'];
type Acceptability = OfficeCapacityDto['acceptability'];

interface ActiveRunRow {
  id: string;
  goal: string;
  status: string;
  subjectId: string | null;
  startedAt: Date | null;
  createdAt: Date;
  issue: { id: string; title: string } | null;
}

interface BudgetConfig {
  aiBudget?: { weeklyTokens?: number; weeklyCostUsd?: number };
}

@Injectable()
export class OfficeService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(projectId?: string): Promise<OfficeSummaryDto> {
    const now = new Date();
    const { since: weekStart } = currentIsoWeek(now);

    // 1) 候选成员：active 的 ai_agent；项目域时按 MemberProjectBinding 过滤
    const members = await this.findAiMembers(projectId);
    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      return {
        projectId,
        colleagues: [],
        totals: {
          colleagues: 0,
          working: 0,
          needYou: 0,
          blocking: 0,
          advisory: 0,
        },
      };
    }

    // 2) 并行拉取各归因源
    const [
      activeRuns,
      weeklyBySubject,
      approvals,
      proposals,
      acceptances,
      conversations,
      dispatches,
      project,
    ] = await Promise.all([
      this.prisma.execution.findMany({
        where: {
          subjectId: { in: memberIds },
          status: { in: ACTIVE_RUN_STATUSES },
        },
        include: { issue: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: MAX_PULL,
      }),
      this.prisma.execution.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: memberIds }, createdAt: { gte: weekStart } },
        _sum: { totalTokens: true, totalCost: true },
      }),
      this.prisma.approvalRequest.findMany({
        where: {
          status: 'pending',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          executionRun: { subjectId: { in: memberIds } },
        },
        include: { executionRun: { select: { subjectId: true } } },
        take: MAX_PULL,
      }),
      this.prisma.decisionProposal.groupBy({
        by: ['proposerId'],
        where: { status: 'pending', proposerId: { in: memberIds } },
        _count: { _all: true },
      }),
      this.prisma.acceptance.findMany({
        where: {
          status: { in: ['pending', 'in_review'] },
          issue: { aiAgentId: { in: memberIds } },
        },
        include: { issue: { select: { aiAgentId: true } } },
        orderBy: { updatedAt: 'desc' },
        take: MAX_PULL,
      }),
      this.prisma.aIConversation.findMany({
        where: { createdBy: { in: memberIds } },
        orderBy: { updatedAt: 'desc' },
        take: MAX_PULL,
      }),
      this.prisma.appConfig.findMany({
        where: { scope: 'runtime.dispatch' },
        orderBy: { updatedAt: 'desc' },
        take: MAX_PULL,
      }),
      projectId
        ? this.prisma.project.findUnique({
            where: { id: projectId },
            select: { config: true },
          })
        : Promise.resolve(null),
    ]);

    // 3) 按成员归因
    const activeRunsByMember = new Map<string, ActiveRunRow[]>();
    for (const run of activeRuns as ActiveRunRow[]) {
      if (!run.subjectId) continue;
      const bucket = activeRunsByMember.get(run.subjectId) ?? [];
      bucket.push(run);
      activeRunsByMember.set(run.subjectId, bucket);
    }

    const blockingByMember = new Map<string, number>();
    for (const approval of approvals) {
      const subjectId = approval.executionRun?.subjectId;
      if (!subjectId) continue;
      blockingByMember.set(
        subjectId,
        (blockingByMember.get(subjectId) ?? 0) + 1,
      );
    }

    const advisoryByMember = new Map<string, number>();
    for (const proposal of proposals) {
      if (!proposal.proposerId) continue;
      advisoryByMember.set(
        proposal.proposerId,
        (advisoryByMember.get(proposal.proposerId) ?? 0) + proposal._count._all,
      );
    }
    for (const acceptance of acceptances) {
      const aiAgentId = acceptance.issue?.aiAgentId;
      if (!aiAgentId) continue;
      advisoryByMember.set(
        aiAgentId,
        (advisoryByMember.get(aiAgentId) ?? 0) + 1,
      );
    }

    const recentConversationByMember = new Map<string, Date>();
    for (const conversation of conversations) {
      if (recentConversationByMember.has(conversation.createdBy)) continue;
      recentConversationByMember.set(
        conversation.createdBy,
        conversation.updatedAt,
      );
    }

    const dispatchByMember = new Map<
      string,
      { providerId?: string; count: number }
    >();
    for (const record of dispatches) {
      const value = record.value as {
        subjectId?: string;
        providerId?: string;
        status?: string;
      };
      if (
        !value.subjectId ||
        !ACTIVE_DISPATCH_STATUSES.has(value.status ?? '')
      ) {
        continue;
      }
      const bucket = dispatchByMember.get(value.subjectId) ?? { count: 0 };
      bucket.count += 1;
      bucket.providerId ??= value.providerId;
      dispatchByMember.set(value.subjectId, bucket);
    }

    const weeklyMap = new Map(
      weeklyBySubject.map((row) => [
        row.subjectId,
        { tokens: row._sum.totalTokens ?? 0, costUsd: row._sum.totalCost ?? 0 },
      ]),
    );

    const budget = (project?.config as BudgetConfig | null)?.aiBudget;

    // 4) 组装员工卡（派生口径与前端 deriveAssistantStatus 一致）
    const colleagues = members.map((member) => {
      const runs = activeRunsByMember.get(member.id) ?? [];
      const blocking = blockingByMember.get(member.id) ?? 0;
      const advisory = advisoryByMember.get(member.id) ?? 0;
      const weekly = weeklyMap.get(member.id) ?? { tokens: 0, costUsd: 0 };
      const dispatch = dispatchByMember.get(member.id);
      const currentRun = runs[0] ? this.mapCurrentRun(runs[0]) : null;

      return {
        memberId: member.id,
        displayName: member.displayName,
        ...(member.avatarUrl ? { avatarUrl: member.avatarUrl } : {}),
        ...(member.title ? { title: member.title } : {}),
        ...(member.defaultExecutionRole
          ? { executionRole: member.defaultExecutionRole }
          : {}),
        ...(member.trustLevel != null ? { trustLevel: member.trustLevel } : {}),
        ...(member.trustScore != null ? { trustScore: member.trustScore } : {}),
        status: this.deriveStatus(blocking, runs.length, advisory),
        blocking,
        advisory,
        capacity: this.deriveCapacity(runs.length, weekly, budget),
        currentRun,
        ...(runs.length > 0
          ? {
              lastRunAt: (runs[0].startedAt ?? runs[0].createdAt).toISOString(),
            }
          : {}),
        ...(recentConversationByMember.get(member.id)
          ? {
              recentConversationAt: recentConversationByMember
                .get(member.id)!
                .toISOString(),
            }
          : {}),
        ...(dispatch?.providerId
          ? { currentProvider: dispatch.providerId }
          : {}),
      };
    });

    // 排序：needYou 优先，其后 working，再按负载降序——注意力先去该去的地方
    const statusRank: Record<ColleagueStatus, number> = {
      needYou: 0,
      working: 1,
      suggestions: 2,
      idle: 3,
    };
    colleagues.sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        b.capacity.activeRuns - a.capacity.activeRuns ||
        a.displayName.localeCompare(b.displayName),
    );

    return {
      projectId,
      colleagues,
      totals: {
        colleagues: colleagues.length,
        working: colleagues.filter((c) => c.status === 'working').length,
        needYou: colleagues.filter((c) => c.status === 'needYou').length,
        blocking: colleagues.reduce((sum, c) => sum + c.blocking, 0),
        advisory: colleagues.reduce((sum, c) => sum + c.advisory, 0),
      },
    };
  }

  private async findAiMembers(projectId?: string) {
    const baseWhere = { type: 'ai_agent', status: 'active' } as const;
    if (!projectId) {
      return this.prisma.member.findMany({
        where: baseWhere,
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          title: true,
          defaultExecutionRole: true,
          trustLevel: true,
          trustScore: true,
        },
        orderBy: { displayName: 'asc' },
      });
    }
    const bindings = await this.prisma.memberProjectBinding.findMany({
      where: { projectId },
      select: { memberId: true },
    });
    const memberIds = [...new Set(bindings.map((b) => b.memberId))];
    if (memberIds.length === 0) return [];
    return this.prisma.member.findMany({
      where: { ...baseWhere, id: { in: memberIds } },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        title: true,
        defaultExecutionRole: true,
        trustLevel: true,
        trustScore: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  /** 忙闲派生：blocking > working > suggestions > idle（同前端 use-assistant-status 口径） */
  private deriveStatus(
    blocking: number,
    activeRuns: number,
    advisory: number,
  ): ColleagueStatus {
    if (blocking > 0) return 'needYou';
    if (activeRuns > 0) return 'working';
    if (advisory > 0) return 'suggestions';
    return 'idle';
  }

  /**
   * 可接活度（MVP 派生口径，非假日历）：
   * 负载 = 在途执行 / 临时容量（与 dashboard avgLoadPct 同源）；
   * 预算使用取 tokens/成本较 高者；满载或超预算 → saturated。
   */
  private deriveCapacity(
    activeRuns: number,
    weekly: { tokens: number; costUsd: number },
    budget?: { weeklyTokens?: number; weeklyCostUsd?: number },
  ): OfficeCapacityDto {
    const loadPct = Math.min(
      100,
      Math.round((activeRuns / PROVISIONAL_CAPACITY_PER_MEMBER) * 100),
    );

    const tokenPct =
      budget?.weeklyTokens != null && budget.weeklyTokens > 0
        ? (weekly.tokens / budget.weeklyTokens) * 100
        : null;
    const costPct =
      budget?.weeklyCostUsd != null && budget.weeklyCostUsd > 0
        ? (weekly.costUsd / budget.weeklyCostUsd) * 100
        : null;
    const budgetUsagePct =
      tokenPct != null || costPct != null
        ? Math.min(100, Math.round(Math.max(tokenPct ?? 0, costPct ?? 0)))
        : undefined;

    const acceptability: Acceptability =
      loadPct >= 100 || (budgetUsagePct ?? 0) >= 100
        ? 'saturated'
        : loadPct >= 60 || (budgetUsagePct ?? 0) >= 80
          ? 'busy'
          : 'available';

    return {
      activeRuns,
      capacityLimit: PROVISIONAL_CAPACITY_PER_MEMBER,
      loadPct,
      weeklyTokens: weekly.tokens,
      weeklyCostUsd: Math.round(weekly.costUsd * 100) / 100,
      ...(budget?.weeklyTokens != null
        ? { budgetTokens: budget.weeklyTokens }
        : {}),
      ...(budget?.weeklyCostUsd != null
        ? { budgetCostUsd: budget.weeklyCostUsd }
        : {}),
      ...(budgetUsagePct != null ? { budgetUsagePct } : {}),
      acceptability,
    };
  }

  private mapCurrentRun(run: ActiveRunRow): OfficeCurrentRunDto {
    return {
      id: run.id,
      goal: run.goal,
      status: run.status,
      ...(run.issue?.title ? { taskTitle: run.issue.title } : {}),
      ...(run.startedAt ? { startedAt: run.startedAt.toISOString() } : {}),
    };
  }
}
