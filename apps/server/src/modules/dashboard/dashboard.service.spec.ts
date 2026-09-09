import type { Mock } from 'vitest';
import { DashboardService, isDoneTransition } from './dashboard.service';
import { PrismaService } from '../../core/database/prisma.service';

const DAY_MS = 86_400_000;

const doneDetail = {
  changes: [{ field: 'status', oldValue: 'todo', newValue: 'done' }],
};

function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    userId: null,
    displayName: '成员一',
    title: null,
    type: 'human',
    ...overrides,
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    title: '任务一',
    status: 'todo',
    priority: 'medium',
    type: 'task',
    customFields: null,
    dueDate: null,
    assigneeId: null,
    assigneeType: 'user',
    aiAgentId: null,
    createdAt: new Date(Date.now() - 3 * DAY_MS),
    metadata: null,
    project: { name: '项目A' },
    ...overrides,
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: Record<string, Record<string, Mock>>;

  beforeEach(() => {
    prisma = {
      member: {
        findMany: vi
          .fn()
          .mockImplementation((args: { select: Record<string, unknown> }) =>
            args.select.displayName ? [memberRow()] : [{ id: 'm1' }],
          ),
      },
      issue: { findMany: vi.fn().mockResolvedValue([]) },
      aIConversation: {
        count: vi
          .fn()
          .mockImplementation((args?: { where?: unknown }) =>
            args?.where ? 3 : 12,
          ),
      },
      aIUsageLog: { findMany: vi.fn().mockResolvedValue([]) },
      memberActivity: {
        findMany: vi
          .fn()
          .mockImplementation((args: { select: Record<string, unknown> }) =>
            args.select.type
              ? [{ type: 'task_create' }, { type: 'task_create' }]
              : [{ memberId: 'm1' }],
          ),
      },
      issueActivity: { findMany: vi.fn().mockResolvedValue([]) },
      projectHealthSnapshot: { findMany: vi.fn().mockResolvedValue([]) },
      project: { findMany: vi.fn().mockResolvedValue([]) },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  describe('isDoneTransition', () => {
    it('识别变为完成态的状态迁移', () => {
      expect(isDoneTransition(doneDetail)).toBe(true);
      expect(
        isDoneTransition({
          changes: [{ field: 'status', oldValue: 'done', newValue: 'todo' }],
        }),
      ).toBe(false);
      expect(isDoneTransition(null)).toBe(false);
    });
  });

  it('delivery：区分 task/bug、priority critical 映射 urgent', async () => {
    prisma.issue.findMany.mockResolvedValue([
      taskRow({ id: 't1', status: 'todo', priority: 'critical' }),
      taskRow({ id: 't2', status: 'in_progress', priority: 'high' }),
      taskRow({ id: 't3', status: 'done', priority: 'low' }),
      taskRow({
        id: 'b1',
        type: 'bug',
        status: 'todo',
        customFields: { severity: 'critical' },
      }),
      taskRow({
        id: 'b2',
        type: 'bug',
        status: 'done',
        customFields: { severity: 'low' },
      }),
    ]);

    const { delivery } = await service.getOverview();

    expect(delivery.totalTasks).toBe(3);
    expect(delivery.activeTasks).toBe(2);
    expect(delivery.byPriority).toEqual([
      { priority: 'urgent', count: 1 },
      { priority: 'high', count: 1 },
      { priority: 'medium', count: 0 },
      { priority: 'low', count: 1 },
    ]);
    expect(delivery.criticalBugs).toBe(1);
    expect(delivery.openBugs).toBe(1);
    expect(delivery.resolvedBugs).toBe(1);
  });

  it('team：人类按 userId、AI 按 aiAgentId 归因负载；本周完成按状态迁移计数', async () => {
    const now = Date.now();
    prisma.member.findMany.mockImplementation(
      (args: { select: Record<string, unknown> }) =>
        args.select.displayName
          ? [
              memberRow({ id: 'm1', userId: 'u1', title: 'Tech Lead' }),
              memberRow({ id: 'm2', type: 'ai_agent' }),
            ]
          : [{ id: 'm1' }, { id: 'm2' }],
    );
    prisma.issue.findMany.mockResolvedValue([
      taskRow({ id: 't1', assigneeId: 'u1', status: 'in_progress' }),
      taskRow({
        id: 't2',
        assigneeType: 'ai_agent',
        aiAgentId: 'm2',
        status: 'todo',
      }),
    ]);
    prisma.issueActivity.findMany.mockResolvedValue([
      {
        issueId: 't1',
        timestamp: new Date(now - DAY_MS),
        detail: doneDetail,
      },
      {
        issueId: 't2',
        timestamp: new Date(now - 10 * DAY_MS),
        detail: doneDetail,
      },
    ]);

    const { team } = await service.getOverview();

    expect(team.totalMembers).toBe(2);
    const human = team.members.find((m) => m.id === 'm1');
    const ai = team.members.find((m) => m.id === 'm2');
    expect(human).toMatchObject({
      name: '成员一',
      role: 'Tech Lead',
      activeTasks: 1,
      completedThisWeek: 1,
    });
    expect(ai).toMatchObject({ activeTasks: 1, completedThisWeek: 0 });
  });

  it('risks：逾期未完成任务派生风险项，非逾期不进列表', async () => {
    const now = Date.now();
    prisma.issue.findMany.mockResolvedValue([
      taskRow({
        id: 't-overdue',
        title: '逾期任务',
        status: 'in_progress',
        priority: 'critical',
        dueDate: new Date(now - 3 * DAY_MS),
      }),
      taskRow({
        id: 't-future',
        dueDate: new Date(now + 3 * DAY_MS),
      }),
    ]);

    const { risks } = await service.getOverview();

    expect(risks.mitigationRatePct).toBe(0);
    expect(risks.items).toHaveLength(1);
    expect(risks.items[0]).toMatchObject({
      id: 't-overdue',
      title: '逾期任务',
      severity: 'critical',
      impact: '逾期 3 天 · 项目A',
      mitigation: '',
    });
  });

  it('trends.health：快照按周分桶取均值，无快照的周不出现', async () => {
    const now = Date.now();
    const dateAt = (daysAgo: number) =>
      new Date(now - daysAgo * DAY_MS).toISOString().slice(0, 10);
    prisma.projectHealthSnapshot.findMany.mockResolvedValue([
      { date: dateAt(3), healthScore: 80 },
      { date: dateAt(3), healthScore: 60 },
      { date: dateAt(16), healthScore: 40 },
    ]);

    const { trends } = await service.getOverview();

    expect(trends.health).toEqual([
      { week: 'W4', score: 40 },
      { week: 'W6', score: 70 },
    ]);
  });

  it('trends.performance：Collaboration 用近 7 天活跃成员占比', async () => {
    prisma.member.findMany.mockImplementation(
      (args: { select: Record<string, unknown> }) =>
        args.select.displayName
          ? [
              memberRow({ userId: 'u1' }),
              memberRow({ id: 'm2' }),
              memberRow({ id: 'm3' }),
            ]
          : [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
    );
    // m1 + m2 近 7 天有活动 → 2/3 ≈ 67
    prisma.memberActivity.findMany.mockImplementation(
      (args: { select: Record<string, unknown> }) =>
        args.select.type ? [] : [{ memberId: 'm1' }, { memberId: 'm2' }],
    );

    const { trends } = await service.getOverview();

    const collaboration = trends.performance.find(
      (p) => p.metric === 'Collaboration',
    );
    expect(collaboration).toEqual({ metric: 'Collaboration', value: 67 });
  });

  it('ai：会话数、周增、月 token 聚合', async () => {
    prisma.aIUsageLog.findMany.mockResolvedValue([
      { provider: 'openai', totalTokens: 1000, estimatedCost: 1.5 },
      { provider: 'openai', totalTokens: 500, estimatedCost: 0.5 },
    ]);

    const { ai, cost } = await service.getOverview();

    expect(ai.conversations).toBe(12);
    expect(ai.weeklyGrowth).toBe(3);
    expect(ai.tokensUsed).toBe(1500);
    expect(cost.monthTotal).toBe(2);
    expect(cost.byCategory).toEqual([
      { name: 'openai', amount: 2, percentage: 100 },
    ]);
  });
});
