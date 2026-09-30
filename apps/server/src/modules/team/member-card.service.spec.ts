import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MemberCardService } from './member-card.service';
import { PrismaService } from '../../core/database/prisma.service';
import { IssueAssigneeService } from './issue-assignee.service';

describe('MemberCardService', () => {
  let service: MemberCardService;

  const mockPrisma = {
    member: {
      findUnique: vi.fn(),
    },
    memberProjectBinding: {
      findMany: vi.fn(),
    },
    teamMember: {
      findMany: vi.fn(),
    },
    memberActivity: {
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    teamProject: {
      findMany: vi.fn(),
    },
    execution: {
      findMany: vi.fn(),
    },
    aIUsageLog: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  };

  const mockTaskAssignee = {
    getMemberLoad: vi.fn(),
  };

  const baseMember = {
    id: 'm1',
    shortId: 'ab12cd34',
    type: 'human',
    displayName: 'Alice',
    handle: 'alice',
    email: 'a@x.com',
    avatarUrl: null,
    title: null,
    description: null,
    trustLevel: null,
    trustScore: null,
    personalPrompt: null,
    thinkingLevel: null,
    tags: null,
    status: 'active',
    userId: 'u1',
    metadata: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberCardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IssueAssigneeService, useValue: mockTaskAssignee },
      ],
    }).compile();
    service = module.get<MemberCardService>(MemberCardService);
    vi.clearAllMocks();
    mockPrisma.memberActivity.findMany.mockResolvedValue([]);
    mockPrisma.teamProject.findMany.mockResolvedValue([]);
    mockPrisma.execution.findMany.mockResolvedValue([]);
    mockTaskAssignee.getMemberLoad.mockResolvedValue({
      todo: 0,
      inProgress: 0,
      completed: 0,
      total: 0,
    });
  });

  it('throws when member not found', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);
    await expect(service.getCard('m1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolves member by shortId when id lookup misses', async () => {
    mockPrisma.member.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(baseMember);
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const card = await service.getCard('ab12cd34');
    expect(card.id).toBe('m1');
    expect(card.shortId).toBe('ab12cd34');
  });

  it('builds aggregate card from binding/team data', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(baseMember);
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([
      { projectId: 'p1', role: 'maintainer', source: 'direct' },
    ]);
    mockPrisma.teamMember.findMany.mockResolvedValue([
      { teamId: 't1', role: 'owner' },
    ]);
    mockPrisma.project.findMany.mockResolvedValue([
      { id: 'p1', name: 'Demo', color: 'red' },
    ]);
    mockPrisma.team.findMany.mockResolvedValue([
      { id: 't1', name: 'Core', color: 'blue' },
    ]);
    mockPrisma.teamProject.findMany.mockResolvedValue([
      { teamId: 't1', projectId: 'p1' },
      { teamId: 't1', projectId: 'p2' },
    ]);
    // 第一次 project.findMany（成员直绑项目）已 mock；团队项目名补齐走第二次调用
    mockPrisma.project.findMany.mockResolvedValueOnce([
      { id: 'p1', name: 'Demo', color: 'red' },
    ]);

    const card = await service.getCard('m1');
    expect(card.id).toBe('m1');
    expect(card.displayName).toBe('Alice');
    expect(card.projects).toHaveLength(1);
    expect(card.projects[0].projectName).toBe('Demo');
    expect(card.projects[0].source).toBe('direct');
    expect(card.teams).toHaveLength(1);
    expect(card.teams[0].teamName).toBe('Core');
    // 团队→项目层级：t1 挂 p1/p2，名称查不到时回落 projectId
    expect(card.teams[0].projects).toEqual([
      { projectId: 'p1', projectName: 'Demo', color: 'red' },
      { projectId: 'p2', projectName: 'p2', color: null },
    ]);
    expect(card.title).toBeNull();
    expect(card.hasPersonalPrompt).toBe(false);
    expect(card.trustLevel).toBeNull();
  });

  it('usage-summary returns honest zeros for human members', async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: 'm1',
      type: 'human',
    });
    const summary = await service.getUsageSummary('m1');
    expect(summary.scope).toBe('human');
    expect(summary.totals.totalTokens).toBe(0);
    expect(summary.totals.totalCost).toBe(0);
    expect(summary.byModel).toEqual([]);
    expect(summary.executions.total).toBe(0);
    expect(summary.lastExecutionAt).toBeNull();
    expect(mockPrisma.execution.findMany).not.toHaveBeenCalled();
  });

  it('usage-summary aggregates executions and usage logs for AI members', async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: 'm1',
      type: 'ai_agent',
    });
    mockPrisma.execution.findMany.mockResolvedValue([
      {
        id: 'r1',
        status: 'completed',
        completedAt: new Date('2026-09-30T10:00:00Z'),
        createdAt: new Date('2026-09-30T09:00:00Z'),
      },
      {
        id: 'r2',
        status: 'failed',
        completedAt: null,
        createdAt: new Date('2026-09-30T11:00:00Z'),
      },
    ]);
    mockPrisma.aIUsageLog.aggregate.mockResolvedValue({
      _sum: {
        totalTokens: 17400,
        promptTokens: 12000,
        completionTokens: 5400,
        estimatedCost: 0.42,
      },
    });
    mockPrisma.aIUsageLog.groupBy.mockResolvedValue([
      {
        modelName: 'glm-5.3',
        _sum: { totalTokens: 17400, estimatedCost: 0.42 },
      },
    ]);

    const summary = await service.getUsageSummary('m1');
    expect(summary.scope).toBe('ai_agent');
    expect(summary.totals).toEqual({
      totalTokens: 17400,
      promptTokens: 12000,
      completionTokens: 5400,
      totalCost: 0.42,
    });
    expect(summary.byModel).toEqual([
      { model: 'glm-5.3', tokens: 17400, cost: 0.42 },
    ]);
    expect(summary.executions).toEqual({
      total: 2,
      completed: 1,
      failed: 1,
      inProgress: 0,
    });
    // 无 completedAt 的执行以 createdAt 参与最近执行时间
    expect(summary.lastExecutionAt).toBe('2026-09-30T11:00:00.000Z');
    // 用量聚合按成员的全部执行 run 关联 AIUsageLog
    expect(mockPrisma.aIUsageLog.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { executionRunId: { in: ['r1', 'r2'] } },
      }),
    );
  });

  it('usage-summary short-circuits usage queries when AI member has no runs', async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: 'm1',
      type: 'ai_agent',
    });
    mockPrisma.execution.findMany.mockResolvedValue([]);
    const summary = await service.getUsageSummary('m1');
    expect(summary.scope).toBe('ai_agent');
    expect(summary.executions.total).toBe(0);
    expect(mockPrisma.aIUsageLog.aggregate).not.toHaveBeenCalled();
    expect(summary.lastExecutionAt).toBeNull();
  });

  it('handles null optional fields', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(baseMember);
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const card = await service.getCard('m1');
    expect(card.id).toBe('m1');
    expect(card.displayName).toBe('Alice');
    expect(card.projects).toHaveLength(0);
    expect(card.teams).toHaveLength(0);
    expect(card.tags).toEqual([]);
  });

  it('getCardBatch skips null entries', async () => {
    mockPrisma.member.findUnique.mockImplementation(
      ({ where }: { where: { id?: string; shortId?: string } }) =>
        where.id === 'm2' || where.shortId === 'm2'
          ? Promise.resolve({ ...baseMember, id: 'm2', shortId: 'zz99yy88' })
          : Promise.resolve(null),
    );
    mockPrisma.memberProjectBinding.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const r = await service.getCardBatch(['m1', 'm2']);
    expect(r).toHaveLength(1);
    expect((r as any)[0].id).toBe('m2');
  });
});
