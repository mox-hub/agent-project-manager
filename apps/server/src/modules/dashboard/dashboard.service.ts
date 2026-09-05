import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

const DAY_MS = 86_400_000;

const DONE_KEYWORDS = ['done', 'complete', 'completed', 'closed'];
const PROGRESS_KEYWORDS = [
  'progress',
  'doing',
  'active',
  'develop',
  'implement',
];
const REVIEW_KEYWORDS = ['review', 'qa', 'test', 'verify'];

export type DashboardTaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

/** 任务状态归一化：与 team-stats / project dashboard-summary 同一口径 */
export function normalizeTaskStatus(
  status: string | null | undefined,
): DashboardTaskStatus {
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

/** Task.priority('critical') → 契约 priority('urgent') */
export function toContractPriority(priority: string): string {
  const normalized = (priority ?? 'medium').toLowerCase();
  return normalized === 'critical' ? 'urgent' : normalized;
}

export type DashboardRiskSeverity = 'critical' | 'high' | 'medium';

export function toRiskSeverity(priority: string): DashboardRiskSeverity {
  const normalized = (priority ?? 'medium').toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  return 'medium';
}

interface StatusChangeDetail {
  changes?: Array<{ field?: string; newValue?: unknown }>;
}

/** 从 TaskActivity.detail 中解析「变为完成态」的状态迁移 */
export function isDoneTransition(detail: unknown): boolean {
  if (!detail || typeof detail !== 'object') return false;
  const { changes } = detail as StatusChangeDetail;
  if (!Array.isArray(changes)) return false;
  return changes.some((change) => {
    if (change?.field !== 'status') return false;
    const next = String(change.newValue ?? '').toLowerCase();
    return DONE_KEYWORDS.some((keyword) => next.includes(keyword));
  });
}

export interface DashboardOverview {
  team: {
    totalMembers: number;
    activeTasks: number;
    avgLoadPct: number;
    members: Array<{
      id: string;
      name: string;
      role: string;
      activeTasks: number;
      completedThisWeek: number;
    }>;
  };
  ai: {
    conversations: number;
    weeklyGrowth: number;
    tokensUsed: number;
    topActivities: Array<{ activity: string; count: number }>;
  };
  cost: {
    monthTotal: number;
    budgetDeltaPct: number;
    byCategory: Array<{ name: string; amount: number; percentage: number }>;
  };
  delivery: {
    activeTasks: number;
    totalTasks: number;
    byPriority: Array<{ priority: string; count: number }>;
    criticalBugs: number;
    openBugs: number;
    resolvedBugs: number;
  };
  health: {
    avgScore: number;
    projects: Array<{
      id: string;
      name: string;
      score: number;
      status: string;
    }>;
  };
  risks: {
    mitigationRatePct: number;
    items: Array<{
      id: string;
      title: string;
      severity: DashboardRiskSeverity;
      impact: string;
      mitigation: string;
    }>;
  };
  trends: {
    productivity: Array<{
      date: string;
      tasks: number;
      velocity: number;
      quality: number;
    }>;
    health: Array<{ week: string; score: number }>;
    performance: Array<{ metric: string; value: number }>;
  };
}

interface MemberRow {
  id: string;
  userId: string | null;
  displayName: string;
  title: string | null;
  type: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  severity: string | null;
  dueDate: Date | null;
  assigneeId: string | null;
  assigneeType: string | null;
  aiAgentId: string | null;
  createdAt: Date;
  metadata: unknown;
  project: { name: string } | null;
}

/** 人均活跃任务容量假设（人）：avgLoadPct 的临时口径，容量字段落地前先按 5 归一 */
const PROVISIONAL_CAPACITY_PER_MEMBER = 5;
const MEMBER_ROWS_LIMIT = 10;
const RISK_ITEMS_LIMIT = 8;
const PRODUCTIVITY_DAYS = 14;
const HEALTH_WEEKS = 6;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<DashboardOverview> {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * DAY_MS);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const productivityStart = new Date(
      now.getTime() - PRODUCTIVITY_DAYS * DAY_MS,
    );
    const healthStart = new Date(now.getTime() - HEALTH_WEEKS * 7 * DAY_MS)
      .toISOString()
      .slice(0, 10);

    const [members, allMemberIds, tasks] = await Promise.all([
      this.prisma.member.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          userId: true,
          displayName: true,
          title: true,
          type: true,
        },
      }),
      this.prisma.member.findMany({
        where: { status: 'active' },
        select: { id: true },
      }),
      this.prisma.task.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          type: true,
          severity: true,
          dueDate: true,
          assigneeId: true,
          assigneeType: true,
          aiAgentId: true,
          createdAt: true,
          metadata: true,
          project: { select: { name: true } },
        },
      }),
    ]);

    const aiMemberIds = members
      .filter((m) => m.type === 'ai_agent')
      .map((m) => m.id);

    const [
      conversationCount,
      weeklyConversationCount,
      monthUsages,
      aiMemberActivities,
      weekMemberActivities,
      doneActivities,
      snapshots,
      projects,
    ] = await Promise.all([
      this.prisma.aIConversation.count(),
      this.prisma.aIConversation.count({
        where: { createdAt: { gte: weekStart } },
      }),
      this.prisma.aIUsageLog.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { provider: true, totalTokens: true, estimatedCost: true },
      }),
      aiMemberIds.length
        ? this.prisma.memberActivity.findMany({
            where: {
              memberId: { in: aiMemberIds },
              createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) },
            },
            select: { type: true },
          })
        : Promise.resolve([] as Array<{ type: string }>),
      allMemberIds.length
        ? this.prisma.memberActivity.findMany({
            where: {
              memberId: { in: allMemberIds.map((m) => m.id) },
              createdAt: { gte: weekStart },
            },
            select: { memberId: true },
          })
        : Promise.resolve([] as Array<{ memberId: string }>),
      this.prisma.taskActivity.findMany({
        where: {
          type: 'status_changed',
          timestamp: { gte: productivityStart },
        },
        select: { taskId: true, timestamp: true, detail: true },
      }),
      this.prisma.projectHealthSnapshot.findMany({
        where: { date: { gte: healthStart } },
        select: { date: true, healthScore: true },
      }),
      this.prisma.project.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          name: true,
          healthScore: true,
          healthStatus: true,
        },
      }),
    ]);

    const activeMemberCount = new Set(
      weekMemberActivities.map((a) => a.memberId),
    ).size;

    return {
      team: this.buildTeam(members, tasks, doneActivities, weekStart),
      ai: {
        conversations: conversationCount,
        weeklyGrowth: weeklyConversationCount,
        tokensUsed: monthUsages.reduce((sum, u) => sum + u.totalTokens, 0),
        topActivities: this.buildTopActivities(aiMemberActivities),
      },
      cost: this.buildCost(monthUsages),
      delivery: this.buildDelivery(tasks),
      health: this.buildHealth(projects),
      risks: this.buildRisks(tasks, now),
      trends: {
        productivity: this.buildProductivity(tasks, doneActivities, now),
        health: this.buildHealthTrend(snapshots),
        performance: this.buildPerformance(
          tasks,
          members.length,
          activeMemberCount,
        ),
      },
    };
  }

  // ── 团队 ────────────────────────────────────────────────────────────────

  /** 成员负载归因键：人类按 Task.assigneeId(userId)，AI 按 aiAgentId(Member.id) */
  private memberTaskKey(member: {
    id: string;
    userId: string | null;
    type: string;
  }): string | null {
    if (member.type === 'ai_agent') return `ai:${member.id}`;
    return member.userId ? `u:${member.userId}` : null;
  }

  private taskAssigneeKey(task: {
    assigneeType: string | null;
    assigneeId: string | null;
    aiAgentId: string | null;
  }): string | null {
    if (task.assigneeType === 'ai_agent' && task.aiAgentId) {
      return `ai:${task.aiAgentId}`;
    }
    return task.assigneeId ? `u:${task.assigneeId}` : null;
  }

  private buildTeam(
    members: MemberRow[],
    tasks: TaskRow[],
    doneActivities: Array<{ taskId: string; timestamp: Date; detail: unknown }>,
    weekStart: Date,
  ): DashboardOverview['team'] {
    const tasksById = new Map(tasks.map((t) => [t.id, t]));
    const activeByMember = new Map<string, number>();
    for (const task of tasks) {
      if (normalizeTaskStatus(task.status) === 'done') continue;
      const key = this.taskAssigneeKey(task);
      if (!key) continue;
      activeByMember.set(key, (activeByMember.get(key) ?? 0) + 1);
    }

    const completedByMember = new Map<string, number>();
    for (const activity of doneActivities) {
      if (activity.timestamp < weekStart) continue;
      if (!isDoneTransition(activity.detail)) continue;
      const task = tasksById.get(activity.taskId);
      if (!task) continue;
      const key = this.taskAssigneeKey(task);
      if (!key) continue;
      completedByMember.set(key, (completedByMember.get(key) ?? 0) + 1);
    }

    const rows = members
      .map((member) => {
        const key = this.memberTaskKey(member);
        return {
          id: member.id,
          name: member.displayName,
          role: member.title ?? member.type,
          activeTasks: key ? (activeByMember.get(key) ?? 0) : 0,
          completedThisWeek: key ? (completedByMember.get(key) ?? 0) : 0,
        };
      })
      .sort((a, b) => b.activeTasks - a.activeTasks)
      .slice(0, MEMBER_ROWS_LIMIT);

    const activeTasks = tasks.filter(
      (t) => normalizeTaskStatus(t.status) !== 'done',
    ).length;
    // 临时口径：人均 5 个活跃任务记 100%，容量字段落地前先顶住展示语义
    const avgLoadPct = Math.min(
      100,
      Math.round(
        (activeTasks /
          Math.max(1, members.length) /
          PROVISIONAL_CAPACITY_PER_MEMBER) *
          100,
      ),
    );

    return {
      totalMembers: members.length,
      activeTasks,
      avgLoadPct,
      members: rows,
    };
  }

  // ── AI ──────────────────────────────────────────────────────────────────

  private buildTopActivities(
    activities: Array<{ type: string }>,
  ): Array<{ activity: string; count: number }> {
    const byType = new Map<string, number>();
    for (const activity of activities) {
      byType.set(activity.type, (byType.get(activity.type) ?? 0) + 1);
    }
    return [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([activity, count]) => ({ activity, count }));
  }

  // ── 成本（AIUsageLog.estimatedCost 按供应商分摊；预算基线未落地，delta 固定 0）──

  private buildCost(
    usages: Array<{
      provider: string;
      totalTokens: number;
      estimatedCost: number | null;
    }>,
  ): DashboardOverview['cost'] {
    const byProvider = new Map<string, number>();
    let monthTotal = 0;
    for (const usage of usages) {
      const cost = usage.estimatedCost ?? 0;
      monthTotal += cost;
      byProvider.set(
        usage.provider,
        (byProvider.get(usage.provider) ?? 0) + cost,
      );
    }
    monthTotal = Math.round(monthTotal * 100) / 100;
    const byCategory = [...byProvider.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => {
        const rounded = Math.round(amount * 100) / 100;
        return {
          name,
          amount: rounded,
          percentage:
            monthTotal > 0 ? Math.round((rounded / monthTotal) * 100) : 0,
        };
      });
    return { monthTotal, budgetDeltaPct: 0, byCategory };
  }

  // ── 交付 ────────────────────────────────────────────────────────────────

  private buildDelivery(tasks: TaskRow[]): DashboardOverview['delivery'] {
    const taskOnly = tasks.filter((t) => t.type !== 'bug');
    const bugOnly = tasks.filter((t) => t.type === 'bug');

    const priorityOrder = ['urgent', 'high', 'medium', 'low'] as const;
    const priorityCount = new Map<string, number>(
      priorityOrder.map((p) => [p, 0]),
    );
    for (const task of taskOnly) {
      const key = toContractPriority(task.priority);
      priorityCount.set(key, (priorityCount.get(key) ?? 0) + 1);
    }

    const isDone = (t: { status: string }) =>
      normalizeTaskStatus(t.status) === 'done';

    return {
      activeTasks: taskOnly.filter((t) => !isDone(t)).length,
      totalTasks: taskOnly.length,
      byPriority: priorityOrder.map((priority) => ({
        priority,
        count: priorityCount.get(priority) ?? 0,
      })),
      criticalBugs: bugOnly.filter(
        (t) => !isDone(t) && t.severity === 'critical',
      ).length,
      openBugs: bugOnly.filter((t) => !isDone(t)).length,
      resolvedBugs: bugOnly.filter((t) => isDone(t)).length,
    };
  }

  // ── 健康 ────────────────────────────────────────────────────────────────

  private buildHealth(
    projects: Array<{
      id: string;
      name: string;
      healthScore: number;
      healthStatus: string;
    }>,
  ): DashboardOverview['health'] {
    const avgScore = projects.length
      ? Math.round(
          projects.reduce((sum, p) => sum + p.healthScore, 0) / projects.length,
        )
      : 0;
    return {
      avgScore,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.healthScore,
        status: p.healthStatus,
      })),
    };
  }

  // ── 风险（派生：逾期未完成任务即风险项；风险登记表落地前 mitigationRatePct=0）──

  private buildRisks(tasks: TaskRow[], now: Date): DashboardOverview['risks'] {
    const overdue = tasks
      .filter((t) => {
        if (normalizeTaskStatus(t.status) === 'done') return false;
        return t.dueDate !== null && t.dueDate < now;
      })
      .sort(
        (a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime(),
      )
      .slice(0, RISK_ITEMS_LIMIT);

    return {
      mitigationRatePct: 0,
      items: overdue.map((task) => {
        const overdueDays = Math.max(
          1,
          Math.ceil(
            (now.getTime() - (task.dueDate as Date).getTime()) / DAY_MS,
          ),
        );
        const mitigation =
          task.metadata &&
          typeof task.metadata === 'object' &&
          typeof (task.metadata as Record<string, unknown>).mitigation ===
            'string'
            ? (task.metadata as Record<string, string>).mitigation
            : '';
        return {
          id: task.id,
          title: task.title,
          severity: toRiskSeverity(task.priority),
          impact: `逾期 ${overdueDays} 天 · ${task.project?.name ?? '未关联项目'}`,
          mitigation,
        };
      }),
    };
  }

  // ── 趋势 ────────────────────────────────────────────────────────────────

  private buildProductivity(
    tasks: TaskRow[],
    doneActivities: Array<{ taskId: string; timestamp: Date; detail: unknown }>,
    now: Date,
  ): DashboardOverview['trends']['productivity'] {
    const tasksById = new Map(tasks.map((t) => [t.id, t]));
    const dayKey = (date: Date) => date.toISOString().slice(5, 10);
    const windowStart = new Date(now.getTime() - PRODUCTIVITY_DAYS * DAY_MS);

    const doneByDay = new Map<string, { total: number; bugs: number }>();
    for (const activity of doneActivities) {
      if (!isDoneTransition(activity.detail)) continue;
      const key = dayKey(activity.timestamp);
      const bucket = doneByDay.get(key) ?? { total: 0, bugs: 0 };
      bucket.total += 1;
      if (tasksById.get(activity.taskId)?.type === 'bug') bucket.bugs += 1;
      doneByDay.set(key, bucket);
    }

    const createdByDay = new Map<string, number>();
    for (const task of tasks) {
      if (task.createdAt < windowStart) continue;
      const key = dayKey(task.createdAt);
      createdByDay.set(key, (createdByDay.get(key) ?? 0) + 1);
    }

    const days: DashboardOverview['trends']['productivity'] = [];
    for (let i = PRODUCTIVITY_DAYS - 1; i >= 0; i -= 1) {
      const date = new Date(now.getTime() - i * DAY_MS);
      const key = dayKey(date);
      const done = doneByDay.get(key) ?? { total: 0, bugs: 0 };
      days.push({
        date: key,
        tasks: done.total,
        velocity: createdByDay.get(key) ?? 0,
        // 非 Bug 完成占比（%）；当日无完成记录按 100 计
        quality:
          done.total > 0 ? Math.round((1 - done.bugs / done.total) * 100) : 100,
      });
    }
    return days;
  }

  private buildHealthTrend(
    snapshots: Array<{ date: string; healthScore: number }>,
  ): DashboardOverview['trends']['health'] {
    const weeks: Array<{ sum: number; count: number }> = Array.from(
      { length: HEALTH_WEEKS },
      () => ({ sum: 0, count: 0 }),
    );
    const now = Date.now();
    for (const snapshot of snapshots) {
      const ageDays =
        (now - new Date(`${snapshot.date}T00:00:00Z`).getTime()) / DAY_MS;
      const weekIndex = HEALTH_WEEKS - 1 - Math.floor(ageDays / 7);
      if (weekIndex < 0 || weekIndex >= HEALTH_WEEKS) continue;
      weeks[weekIndex].sum += snapshot.healthScore;
      weeks[weekIndex].count += 1;
    }
    return weeks
      .map((week, index) => ({
        week: `W${index + 1}`,
        score: week.count > 0 ? Math.round(week.sum / week.count) : 0,
      }))
      .filter((week) => week.score > 0);
  }

  /** 表现指标只给有真实数据源的维度：完成率/质量/准时/协作，无数据源维度不造数 */
  private buildPerformance(
    tasks: TaskRow[],
    totalMembers: number,
    activeMemberCount: number,
  ): Array<{ metric: string; value: number }> {
    const total = tasks.length;
    const done = tasks.filter(
      (t) => normalizeTaskStatus(t.status) === 'done',
    ).length;
    const doneBugs = tasks.filter(
      (t) => t.type === 'bug' && normalizeTaskStatus(t.status) === 'done',
    ).length;
    const now = new Date();
    const overdue = tasks.filter(
      (t) =>
        normalizeTaskStatus(t.status) !== 'done' &&
        t.dueDate !== null &&
        t.dueDate < now,
    ).length;

    const pct = (numerator: number, denominator: number) =>
      denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return [
      { metric: 'Velocity', value: pct(done, total) },
      { metric: 'Quality', value: pct(done - doneBugs, done) },
      { metric: 'OnTime', value: total > 0 ? 100 - pct(overdue, total) : 0 },
      { metric: 'Collaboration', value: pct(activeMemberCount, totalMembers) },
    ];
  }
}
