import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

/** 无费率成员的人天默认费率（分）：¥500/天 */
export const DEFAULT_DAY_RATE_CENTS = 50000;

export interface TeamStatsOverview {
  memberCount: number;
  humanCount: number;
  aiCount: number;
  tokenUsage: {
    daily: Array<{
      date: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    }>;
    totals: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  };
  heatmap: Array<{ date: string; count: number }>;
  personDays: {
    defaultRateCents: number;
    rows: Array<{
      memberId: string;
      name: string;
      type: string;
      activeDays: number;
      rateCents: number;
      rateIsDefault: boolean;
      costCents: number;
    }>;
    totalCostCents: number;
  };
  leaderboard: Array<{
    memberId: string;
    name: string;
    type: string;
    activityCount: number;
    totalTokens: number;
  }>;
}

export interface TeamProjectStats {
  projectCount: number;
  totals: {
    taskCount: number;
    todoCount: number;
    inProgressCount: number;
    inReviewCount: number;
    doneCount: number;
    overdueCount: number;
    doneRate: number;
    avgProgress: number;
  };
  projects: Array<{
    projectId: string;
    name: string;
    color: string | null;
    icon: string | null;
    status: string;
    healthStatus: string | null;
    progress: number;
    targetDate: Date | null;
    taskCount: number;
    todoCount: number;
    inProgressCount: number;
    inReviewCount: number;
    doneCount: number;
    overdueCount: number;
  }>;
}

/**
 * 团队统计：token 用量（AIUsageLog 真实归因）、活跃热力图（MemberActivity 真实计数）、
 * 人天成本（活跃天 × 费率，未设费率按默认档并标注 rateIsDefault）。
 */
@Injectable()
export class TeamStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(teamId: string, days = 30): Promise<TeamStatsOverview> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const since = new Date(Date.now() - days * 86400_000);
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId },
      select: { memberId: true },
    });
    const memberIds = teamMembers.map((t) => t.memberId);

    const members = memberIds.length
      ? await this.prisma.member.findMany({
          where: { id: { in: memberIds } },
          select: {
            id: true,
            displayName: true,
            type: true,
            costRatePerDay: true,
            userId: true,
          },
        })
      : [];
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const userIds = members
      .map((m) => m.userId)
      .filter((u): u is string => Boolean(u));

    // ── token 用量：AI 成员经 ExecutionRun 归因，人类成员经 userId 归因 ──
    const runs = memberIds.length
      ? await this.prisma.executionRun.findMany({
          where: { subjectId: { in: memberIds } },
          select: { id: true, subjectId: true, createdAt: true },
        })
      : [];
    const runById = new Map(runs.map((r) => [r.id, r]));
    const usage = await this.prisma.aIUsageLog.findMany({
      where: {
        createdAt: { gte: since },
        OR: [
          ...(runs.length
            ? [{ executionRunId: { in: [...runById.keys()] } }]
            : []),
          ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ],
      },
      select: {
        executionRunId: true,
        userId: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true,
        createdAt: true,
      },
    });

    // 按成员归因 usage（供排行榜），按日聚合（供折线图）
    const tokensByMember = new Map<string, number>();
    const dailyMap = new Map<
      string,
      {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCost: number;
      }
    >();
    for (const u of usage) {
      const run = u.executionRunId ? runById.get(u.executionRunId) : undefined;
      const memberId =
        run?.subjectId ??
        members.find((m) => m.userId && m.userId === u.userId)?.id ??
        null;
      if (memberId) {
        tokensByMember.set(
          memberId,
          (tokensByMember.get(memberId) ?? 0) + u.totalTokens,
        );
      }
      const date = u.createdAt.toISOString().slice(0, 10);
      const cur = dailyMap.get(date) ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      };
      cur.promptTokens += u.promptTokens;
      cur.completionTokens += u.completionTokens;
      cur.totalTokens += u.totalTokens;
      cur.estimatedCost += u.estimatedCost ?? 0;
      dailyMap.set(date, cur);
    }
    const daily = [...dailyMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({ date, ...v }));
    const totals = usage.reduce(
      (acc, u) => ({
        promptTokens: acc.promptTokens + u.promptTokens,
        completionTokens: acc.completionTokens + u.completionTokens,
        totalTokens: acc.totalTokens + u.totalTokens,
        estimatedCost: acc.estimatedCost + (u.estimatedCost ?? 0),
      }),
      {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
    );

    // ── 活跃热力图 + 人天：MemberActivity 按日/按成员去重计数 ──
    const activities = memberIds.length
      ? await this.prisma.memberActivity.findMany({
          where: { memberId: { in: memberIds }, createdAt: { gte: since } },
          select: { memberId: true, createdAt: true },
        })
      : [];
    const heatMap = new Map<string, number>();
    const memberActiveDays = new Map<string, Set<string>>();
    const activityCount = new Map<string, number>();
    for (const a of activities) {
      const date = a.createdAt.toISOString().slice(0, 10);
      heatMap.set(date, (heatMap.get(date) ?? 0) + 1);
      activityCount.set(a.memberId, (activityCount.get(a.memberId) ?? 0) + 1);
      if (!memberActiveDays.has(a.memberId)) {
        memberActiveDays.set(a.memberId, new Set());
      }
      memberActiveDays.get(a.memberId)!.add(date);
    }

    const personRows = members.map((m) => {
      const activeDays = memberActiveDays.get(m.id)?.size ?? 0;
      const rateIsDefault =
        m.costRatePerDay === null || m.costRatePerDay === undefined;
      const rateCents = rateIsDefault
        ? DEFAULT_DAY_RATE_CENTS
        : m.costRatePerDay!;
      return {
        memberId: m.id,
        name: m.displayName,
        type: m.type,
        activeDays,
        rateCents,
        rateIsDefault,
        costCents: activeDays * rateCents,
      };
    });

    return {
      memberCount: members.length,
      humanCount: members.filter((m) => m.type === 'human').length,
      aiCount: members.filter((m) => m.type === 'ai_agent').length,
      tokenUsage: { daily, totals },
      heatmap: [...heatMap.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, count]) => ({ date, count })),
      personDays: {
        defaultRateCents: DEFAULT_DAY_RATE_CENTS,
        rows: personRows,
        totalCostCents: personRows.reduce((sum, r) => sum + r.costCents, 0),
      },
      leaderboard: members
        .map((m) => ({
          memberId: m.id,
          name: m.displayName,
          type: m.type,
          activityCount: activityCount.get(m.id) ?? 0,
          totalTokens: tokensByMember.get(m.id) ?? 0,
        }))
        .sort(
          (a, b) =>
            b.activityCount - a.activityCount || b.totalTokens - a.totalTokens,
        ),
    };
  }

  /** 团队所辖项目统计：任务状态分布与逾期口径对齐项目 dashboard-summary */
  async getProjectStats(teamId: string): Promise<TeamProjectStats> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const bindings = await this.prisma.teamProject.findMany({
      where: { teamId },
      select: { projectId: true },
    });
    const projectIds = [...new Set(bindings.map((b) => b.projectId))];
    if (!projectIds.length) {
      return {
        projectCount: 0,
        totals: {
          taskCount: 0,
          todoCount: 0,
          inProgressCount: 0,
          inReviewCount: 0,
          doneCount: 0,
          overdueCount: 0,
          doneRate: 0,
          avgProgress: 0,
        },
        projects: [],
      };
    }

    const [projects, tasks] = await Promise.all([
      this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          status: true,
          healthStatus: true,
          progress: true,
          targetDate: true,
        },
      }),
      this.prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, status: true, dueDate: true },
      }),
    ]);

    const now = new Date();
    const statsByProject = new Map<
      string,
      {
        taskCount: number;
        todoCount: number;
        inProgressCount: number;
        inReviewCount: number;
        doneCount: number;
        overdueCount: number;
      }
    >();
    for (const task of tasks) {
      if (!task.projectId) continue;
      const bucket = statsByProject.get(task.projectId) ?? {
        taskCount: 0,
        todoCount: 0,
        inProgressCount: 0,
        inReviewCount: 0,
        doneCount: 0,
        overdueCount: 0,
      };
      bucket.taskCount += 1;
      const normalized = normalizeStatus(task.status);
      if (normalized === 'todo') bucket.todoCount += 1;
      else if (normalized === 'in_progress') bucket.inProgressCount += 1;
      else if (normalized === 'in_review') bucket.inReviewCount += 1;
      else bucket.doneCount += 1;
      if (task.dueDate && normalized !== 'done' && task.dueDate < now) {
        bucket.overdueCount += 1;
      }
      statsByProject.set(task.projectId, bucket);
    }

    const rows = projects.map((project) => ({
      projectId: project.id,
      name: project.name,
      color: project.color,
      icon: project.icon,
      status: project.status,
      healthStatus: project.healthStatus,
      progress: project.progress,
      targetDate: project.targetDate,
      ...(statsByProject.get(project.id) ?? {
        taskCount: 0,
        todoCount: 0,
        inProgressCount: 0,
        inReviewCount: 0,
        doneCount: 0,
        overdueCount: 0,
      }),
    }));

    const taskCount = rows.reduce((sum, r) => sum + r.taskCount, 0);
    const doneCount = rows.reduce((sum, r) => sum + r.doneCount, 0);
    const overdueCount = rows.reduce((sum, r) => sum + r.overdueCount, 0);
    const avgProgress = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + r.progress, 0) / rows.length)
      : 0;

    return {
      projectCount: rows.length,
      totals: {
        taskCount,
        todoCount: rows.reduce((sum, r) => sum + r.todoCount, 0),
        inProgressCount: rows.reduce((sum, r) => sum + r.inProgressCount, 0),
        inReviewCount: rows.reduce((sum, r) => sum + r.inReviewCount, 0),
        doneCount,
        overdueCount,
        doneRate: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
        avgProgress,
      },
      projects: rows,
    };
  }
}

const DONE_KEYWORDS = ['done', 'complete', 'completed', 'closed'];
const PROGRESS_KEYWORDS = [
  'progress',
  'doing',
  'active',
  'develop',
  'implement',
];
const REVIEW_KEYWORDS = ['review', 'qa', 'test', 'verify'];

type NormalizedTaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

function normalizeStatus(
  status: string | null | undefined,
): NormalizedTaskStatus {
  const normalized = (status ?? 'todo').toLowerCase();
  if (DONE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'done';
  }
  if (REVIEW_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'in_review';
  }
  if (PROGRESS_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'in_progress';
  }
  return 'todo';
}
