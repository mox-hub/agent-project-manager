import { OfficeService } from './office.service';
import { PrismaService } from '../../core/database/prisma.service';

/**
 * 办公室聚合单元测试：只验派生口径（忙闲优先级 / 待决归因 / 容量与预算），
 * 不起 AppModule（e2e 覆盖 HTTP 面）。
 */

const aiMember = (overrides: Record<string, unknown> = {}) => ({
  id: 'ai1',
  displayName: '小码',
  avatarUrl: null,
  title: '全栈工程师',
  defaultExecutionRole: 'coder',
  trustLevel: 2,
  trustScore: 88,
  ...overrides,
});

function buildPrisma(overrides: Record<string, jest.Mock> = {}) {
  const base: Record<string, jest.Mock> = {
    'member.findMany': jest.fn().mockResolvedValue([aiMember()]),
    'memberProjectBinding.findMany': jest.fn().mockResolvedValue([]),
    'executionRun.findMany': jest.fn().mockResolvedValue([]),
    'executionRun.groupBy': jest.fn().mockResolvedValue([]),
    'approvalRequest.findMany': jest.fn().mockResolvedValue([]),
    'decisionProposal.groupBy': jest.fn().mockResolvedValue([]),
    'acceptance.findMany': jest.fn().mockResolvedValue([]),
    'aIConversation.findMany': jest.fn().mockResolvedValue([]),
    'appConfig.findMany': jest.fn().mockResolvedValue([]),
    'project.findUnique': jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  const prisma = new Proxy(
    {},
    {
      get: (_t, model: string) =>
        new Proxy(
          {},
          {
            get: (_t2, action: string) =>
              base[`${model}.${action}`] ?? jest.fn().mockResolvedValue([]),
          },
        ),
    },
  );
  return { prisma, base };
}

function buildService(prisma: unknown) {
  return new OfficeService(prisma as PrismaService);
}

describe('OfficeService', () => {
  it('无 AI 成员时返回空汇总', async () => {
    const { prisma, base } = buildPrisma({
      'member.findMany': jest.fn().mockResolvedValue([]),
    });
    const summary = await buildService(prisma).getSummary();
    expect(summary.colleagues).toEqual([]);
    expect(summary.totals).toEqual({
      colleagues: 0,
      working: 0,
      needYou: 0,
      blocking: 0,
      advisory: 0,
    });
    // 未触后续归因查询（memberIds 为空提前返回）
    expect(base['executionRun.findMany']).not.toHaveBeenCalled();
  });

  it('忙闲派生优先级：needYou > working > suggestions > idle', async () => {
    const { prisma } = buildPrisma({
      'member.findMany': jest
        .fn()
        .mockResolvedValue([
          aiMember({ id: 'a-need', displayName: '阿堵' }),
          aiMember({ id: 'a-work', displayName: '阿干' }),
          aiMember({ id: 'a-sugg', displayName: '阿议' }),
          aiMember({ id: 'a-idle', displayName: '阿闲' }),
        ]),
      'approvalRequest.findMany': jest
        .fn()
        .mockResolvedValue([
          { id: 'ap1', executionRun: { subjectId: 'a-need' } },
        ]),
      'executionRun.findMany': jest.fn().mockResolvedValue([
        {
          id: 'run1',
          goal: '实现登录接口',
          status: 'in_progress',
          subjectId: 'a-work',
          startedAt: new Date('2026-09-06T01:00:00Z'),
          createdAt: new Date('2026-09-06T00:30:00Z'),
          task: { id: 't1', title: '登录接口' },
        },
      ]),
      'decisionProposal.groupBy': jest
        .fn()
        .mockResolvedValue([{ proposerId: 'a-sugg', _count: { _all: 2 } }]),
    });
    const summary = await buildService(prisma).getSummary();
    const byStatus = Object.fromEntries(
      summary.colleagues.map((c) => [c.memberId, c]),
    );
    expect(byStatus['a-need'].status).toBe('needYou');
    expect(byStatus['a-need'].blocking).toBe(1);
    expect(byStatus['a-work'].status).toBe('working');
    expect(byStatus['a-work'].currentRun).toMatchObject({
      id: 'run1',
      goal: '实现登录接口',
      taskTitle: '登录接口',
    });
    expect(byStatus['a-work'].lastRunAt).toBe('2026-09-06T01:00:00.000Z');
    expect(byStatus['a-sugg'].status).toBe('suggestions');
    expect(byStatus['a-sugg'].advisory).toBe(2);
    expect(byStatus['a-idle'].status).toBe('idle');
    // 排序：needYou 在最前
    expect(summary.colleagues[0].memberId).toBe('a-need');
    expect(summary.totals.needYou).toBe(1);
    expect(summary.totals.working).toBe(1);
    expect(summary.totals.blocking).toBe(1);
    expect(summary.totals.advisory).toBe(2);
  });

  it('验收待决按任务 aiAgentId 归因为 advisory', async () => {
    const { prisma } = buildPrisma({
      'acceptance.findMany': jest.fn().mockResolvedValue([
        { id: 'acc1', task: { aiAgentId: 'ai1' } },
        { id: 'acc2', task: { aiAgentId: 'ai1' } },
        { id: 'acc3', task: { aiAgentId: 'other' } },
      ]),
    });
    const summary = await buildService(prisma).getSummary();
    expect(summary.colleagues[0].advisory).toBe(2);
    expect(summary.colleagues[0].status).toBe('suggestions');
  });

  it('可接活度：负载与预算封顶，超预算判 saturated', async () => {
    const { prisma } = buildPrisma({
      'memberProjectBinding.findMany': jest
        .fn()
        .mockResolvedValue([{ memberId: 'ai1' }]),
      'executionRun.findMany': jest.fn().mockResolvedValue(
        Array.from({ length: 2 }, (_, i) => ({
          id: `run${i}`,
          goal: 'g',
          status: 'in_progress',
          subjectId: 'ai1',
          startedAt: null,
          createdAt: new Date(),
          task: null,
        })),
      ),
      'executionRun.groupBy': jest
        .fn()
        .mockResolvedValue([
          { subjectId: 'ai1', _sum: { totalTokens: 5000, totalCost: 6 } },
        ]),
      'project.findUnique': jest.fn().mockResolvedValue({
        config: { aiBudget: { weeklyCostUsd: 10 } },
      }),
    });
    const summary = await buildService(prisma).getSummary('p1');
    const card = summary.colleagues[0];
    expect(card.capacity).toMatchObject({
      activeRuns: 2,
      capacityLimit: 5,
      loadPct: 40,
      weeklyTokens: 5000,
      weeklyCostUsd: 6,
      budgetCostUsd: 10,
      budgetUsagePct: 60,
      acceptability: 'available',
    });
    // 项目域才带预算 → projectId 透传
    expect(summary.projectId).toBe('p1');
  });

  it('预算超 100% 封顶并判 saturated', async () => {
    const { prisma } = buildPrisma({
      'memberProjectBinding.findMany': jest
        .fn()
        .mockResolvedValue([{ memberId: 'ai1' }]),
      'executionRun.groupBy': jest
        .fn()
        .mockResolvedValue([
          { subjectId: 'ai1', _sum: { totalTokens: 0, totalCost: 33 } },
        ]),
      'project.findUnique': jest.fn().mockResolvedValue({
        config: { aiBudget: { weeklyCostUsd: 10 } },
      }),
    });
    const summary = await buildService(prisma).getSummary('p1');
    expect(summary.colleagues[0].capacity.budgetUsagePct).toBe(100);
    expect(summary.colleagues[0].capacity.acceptability).toBe('saturated');
    expect(summary.colleagues[0].status).toBe('idle');
  });

  it('项目域按 MemberProjectBinding 过滤成员', async () => {
    const { prisma, base } = buildPrisma({
      'memberProjectBinding.findMany': jest
        .fn()
        .mockResolvedValue([{ memberId: 'ai1' }, { memberId: 'ai1' }]),
    });
    await buildService(prisma).getSummary('p1');
    expect(base['memberProjectBinding.findMany']).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'p1' } }),
    );
    expect(base['member.findMany']).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['ai1'] } }),
      }),
    );
  });

  it('在途派发提取 CLI provider', async () => {
    const { prisma } = buildPrisma({
      'appConfig.findMany': jest.fn().mockResolvedValue([
        {
          value: {
            subjectId: 'ai1',
            providerId: 'claude-code',
            status: 'running',
          },
        },
        {
          value: {
            subjectId: 'ai1',
            providerId: 'codex',
            status: 'cancelled',
          },
        },
      ]),
    });
    const summary = await buildService(prisma).getSummary();
    expect(summary.colleagues[0].currentProvider).toBe('claude-code');
  });

  it('最近会话按 createdBy 归因取最新一条', async () => {
    const { prisma } = buildPrisma({
      'aIConversation.findMany': jest.fn().mockResolvedValue([
        { createdBy: 'ai1', updatedAt: new Date('2026-09-06T08:00:00Z') },
        { createdBy: 'ai1', updatedAt: new Date('2026-09-05T08:00:00Z') },
      ]),
    });
    const summary = await buildService(prisma).getSummary();
    expect(summary.colleagues[0].recentConversationAt).toBe(
      '2026-09-06T08:00:00.000Z',
    );
  });
});
