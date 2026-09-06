import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('ProposalService', () => {
  let service: ProposalService;

  const mockPrismaService = {
    decisionProposal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    issue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    issueAssignee: {
      upsert: jest.fn(),
    },
    statusDefinition: {
      findMany: jest.fn(),
    },
    executionRun: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    acceptance: {
      count: jest.fn(),
    },
    milestone: {
      update: jest.fn(),
    },
  };

  const tx = {
    issue: {
      create: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
    },
    issueAssignee: {
      upsert: jest.fn(),
    },
  };

  const mockTx = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalService,
        {
          provide: PrismaService,
          useValue: { ...mockPrismaService, $transaction: mockTx },
        },
      ],
    }).compile();

    service = module.get<ProposalService>(ProposalService);
    mockTx.mockImplementation(async (fn: (t: unknown) => Promise<void>) =>
      fn(tx),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolve', () => {
    const pendingPlan = {
      id: 'pr-1',
      kind: 'plan',
      status: 'pending',
      projectId: 'p1',
      taskId: 't-1',
      payload: { taskId: 't-1', added: [{ title: '子任务 A' }] },
    };

    it('plan accept：在父任务下创建子任务并落决议', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingPlan,
      );
      mockPrismaService.issue.findUnique.mockResolvedValue({
        id: 't-1',
        projectId: 'p1',
        type: 'task',
      });
      tx.issue.create.mockResolvedValue({ id: 't-new' });
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...pendingPlan,
        status: 'accepted',
      });

      const result = await service.resolve('pr-1', { action: 'accept' }, 'u-1');

      expect(mockTx).toHaveBeenCalled();
      expect(tx.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentTaskId: 't-1',
            title: '子任务 A',
            status: 'todo',
          }),
        }),
      );
      expect(result.status).toBe('accepted');
    });

    it('reject 缺 reason 报 400，且不落决议', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingPlan,
      );

      await expect(
        service.resolve('pr-1', { action: 'reject' }, 'u-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.decisionProposal.update).not.toHaveBeenCalled();
    });

    it('非 pending 提案拒绝重复决议', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingPlan,
        status: 'accepted',
      });

      await expect(
        service.resolve('pr-1', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('clarify accept 缺 answer 报 400', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingPlan,
        kind: 'clarify',
        payload: { question: '?', choices: [] },
      });

      await expect(
        service.resolve('pr-1', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.resolve('pr-1', { action: 'accept', answer: 'A' }, 'u-1'),
      ).resolves.toMatchObject({ status: 'accepted' });
    });

    it('resolution cancel：任务未配置取消终态时拒绝（宁可不动数据）', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingPlan,
        kind: 'resolution',
        payload: { entityType: 'task', entityId: 't-1' },
      });
      mockPrismaService.issue.findUnique.mockResolvedValue({
        id: 't-1',
        projectId: 'p1',
        status: 'in_progress',
      });
      mockPrismaService.statusDefinition.findMany.mockResolvedValue([
        { key: 'done', isFinal: true },
      ]);

      await expect(
        service.resolve('pr-1', { action: 'cancel' }, 'u-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateAssignment', () => {
    it('无待分派任务时报 400', async () => {
      mockPrismaService.issue.findMany.mockResolvedValue([]);
      mockPrismaService.member.findMany.mockResolvedValue([]);

      await expect(service.generateAssignment('p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('生成提案：未分配任务分派给信任分最高的 AI 成员', async () => {
      mockPrismaService.issue.findMany.mockResolvedValue([
        { id: 't-1', title: '任务一' },
        { id: 't-2', title: '任务二' },
      ]);
      mockPrismaService.member.findMany.mockResolvedValue([
        { id: 'm-top', displayName: 'agent-backend', trustScore: 92 },
      ]);
      mockPrismaService.decisionProposal.findMany.mockResolvedValue([]);
      mockPrismaService.decisionProposal.create.mockImplementation(
        (args: { data: Record<string, unknown> }) => Promise.resolve(args.data),
      );

      const proposal = (await service.generateAssignment('p1')) as unknown as {
        title: string;
        payload: { assignments: unknown[] };
      };

      expect(proposal.title).toContain('2 个未分配任务');
      expect(proposal.payload.assignments).toHaveLength(2);
    });
  });
});
