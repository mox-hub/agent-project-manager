import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

describe('ProposalService', () => {
  let service: ProposalService;

  const mockPrismaService = {
    decisionProposal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    issue: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    issueAssignee: {
      upsert: vi.fn(),
    },
    statusDefinition: {
      findMany: vi.fn(),
    },
    execution: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    acceptance: {
      count: vi.fn(),
    },
    milestone: {
      update: vi.fn(),
    },
    aIWorkflowDefinition: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const tx = {
    issue: {
      create: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
    },
    issueAssignee: {
      upsert: vi.fn(),
    },
    acceptance: {
      create: vi.fn(),
    },
    acceptanceCriteria: {
      createMany: vi.fn(),
    },
  };

  const mockTx = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalService,
        {
          provide: PrismaService,
          useValue: { ...mockPrismaService, $transaction: mockTx },
        },
        { provide: MessageBusService, useValue: { publish: vi.fn() } },
      ],
    }).compile();

    service = module.get<ProposalService>(ProposalService);
    mockTx.mockImplementation(async (fn: (t: unknown) => Promise<void>) =>
      fn(tx),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      issueId: 't-1',
      payload: { issueId: 't-1', added: [{ title: '子任务 A' }] },
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
            parentIssueId: 't-1',
            title: '子任务 A',
            status: 'todo',
          }),
        }),
      );
      expect(result.status).toBe('accepted');
    });

    it('组合件 accept（无父任务）：以提案 projectId 建顶级任务族，验收单与 criteria 同事务落库并记 AI 溯源', async () => {
      const composite = {
        id: 'pr-2',
        kind: 'plan',
        status: 'pending',
        projectId: 'p1',
        issueId: null,
        payload: {
          added: [
            {
              title: '决定登记表',
              estimate: 8,
              acceptance: {
                criteria: [
                  {
                    criteriaType: 'functional',
                    content: '会后 10 分钟内可查到决定',
                    category: '核心',
                  },
                  { criteriaType: 'technical', content: '接口 P95 < 300ms' },
                ],
              },
            },
            { title: '会后提醒' },
          ],
        },
      };
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        composite,
      );
      tx.issue.create.mockImplementation(
        async ({ data }: { data: { title: string } }) => ({
          id: `t-${data.title}`,
          title: data.title,
        }),
      );
      tx.acceptance.create.mockResolvedValue({ id: 'acc-1' });
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...composite,
        status: 'accepted',
      });

      const result = await service.resolve('pr-2', { action: 'accept' }, 'u-1');

      // 两个顶级任务（parentIssueId null），projectId 取提案
      expect(tx.issue.create).toHaveBeenCalledTimes(2);
      expect(tx.issue.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'p1',
            parentIssueId: null,
            title: '决定登记表',
          }),
        }),
      );
      // 第一任务带验收单：draft + artifact + 溯源 criteria
      expect(tx.acceptance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            issueId: 't-决定登记表',
            status: 'draft',
            title: '验收 - 决定登记表',
            completionType: 'artifact',
          }),
        }),
      );
      expect(tx.acceptanceCriteria.createMany).toHaveBeenCalledTimes(1);
      const criteriaArgs = tx.acceptanceCriteria.createMany.mock.calls[0][0];
      expect(criteriaArgs.data).toHaveLength(2);
      expect(criteriaArgs.data[0]).toMatchObject({
        acceptanceId: 'acc-1',
        source: 'ai-generated-from-interview',
        content: '会后 10 分钟内可查到决定',
        category: '核心',
      });
      expect(criteriaArgs.data[1].category).toBeUndefined();
      // 第二任务无验收段 → 不建验收单
      expect(tx.acceptance.create).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('accepted');
    });

    it('组合件 accept 缺 projectId 报 400；acceptance criteria 为空报 400', async () => {
      const noProject = {
        id: 'pr-3',
        kind: 'plan',
        status: 'pending',
        projectId: null,
        issueId: null,
        payload: { added: [{ title: 'X' }] },
      };
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        noProject,
      );
      await expect(
        service.resolve('pr-3', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(/requires projectId/);

      const emptyCriteria = {
        id: 'pr-4',
        kind: 'plan',
        status: 'pending',
        projectId: 'p1',
        issueId: null,
        payload: {
          added: [{ title: 'X', acceptance: { criteria: [] } }],
        },
      };
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        emptyCriteria,
      );
      tx.issue.create.mockResolvedValue({ id: 't-x', title: 'X' });
      await expect(
        service.resolve('pr-4', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(/non-empty criteria/);
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

  describe('workflow_def accept（CAP-A-11：AI 代写定义落库）', () => {
    const validDefinition = {
      version: 1,
      steps: [
        { id: 'draft', type: 'llm', prompt: '起草 {input.topic}' },
        {
          id: 'review',
          type: 'human-confirm',
          message: '请审核 {steps.draft.value}',
        },
      ],
    };

    const pendingCreate = {
      id: 'pr-wf-1',
      kind: 'workflow_def',
      status: 'pending',
      projectId: null,
      issueId: null,
      payload: {
        mode: 'create',
        key: 'standup-helper',
        name: '站会助手',
        description: '整理站会纪要',
        definition: validDefinition,
      },
    };

    it('create accept：文法合法且 key 未占用 → 落库新定义（ createdBy=批准人）', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingCreate,
      );
      mockPrismaService.aIWorkflowDefinition.findUnique.mockResolvedValue(null);
      mockPrismaService.aIWorkflowDefinition.create.mockResolvedValue({
        id: 'wf-new',
      });
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...pendingCreate,
        status: 'accepted',
      });

      await service.resolve('pr-wf-1', { action: 'accept' }, 'approver-1');

      expect(
        mockPrismaService.aIWorkflowDefinition.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: 'standup-helper',
            name: '站会助手',
            createdBy: 'approver-1',
          }),
        }),
      );
      // definition 中的步骤保持原样落库
      const created = mockPrismaService.aIWorkflowDefinition.create.mock
        .calls[0][0] as { data: { definition: unknown } };
      expect(created.data.definition).toEqual(validDefinition);
    });

    it('create accept 但 key 已存在 → 400，不落库', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingCreate,
      );
      mockPrismaService.aIWorkflowDefinition.findUnique.mockResolvedValue({
        id: 'wf-exists',
        version: 2,
      });

      await expect(
        service.resolve('pr-wf-1', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(/已存在/);
      expect(
        mockPrismaService.aIWorkflowDefinition.create,
      ).not.toHaveBeenCalled();
    });

    it('文法非法（步骤缺必填字段）→ 400 且不落库', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingCreate,
        payload: {
          ...pendingCreate.payload,
          definition: { version: 1, steps: [{ id: 'bad', type: 'llm' }] },
        },
      });

      await expect(
        service.resolve('pr-wf-1', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(/文法非法/);
      expect(
        mockPrismaService.aIWorkflowDefinition.create,
      ).not.toHaveBeenCalled();
    });

    it('update accept：key 存在 → version+1 升版落库', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingCreate,
        payload: {
          ...pendingCreate.payload,
          mode: 'update',
          key: 'standup-helper',
        },
      });
      mockPrismaService.aIWorkflowDefinition.findUnique.mockResolvedValue({
        id: 'wf-old',
        version: 3,
      });
      mockPrismaService.aIWorkflowDefinition.update.mockResolvedValue({
        id: 'wf-old',
      });
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...pendingCreate,
        status: 'accepted',
      });

      await service.resolve('pr-wf-1', { action: 'accept' }, 'u-1');

      expect(
        mockPrismaService.aIWorkflowDefinition.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'standup-helper' },
          data: expect.objectContaining({ version: 4 }),
        }),
      );
    });

    it('update accept 但 key 不存在 → 400', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingCreate,
        payload: {
          ...pendingCreate.payload,
          mode: 'update',
        },
      });
      mockPrismaService.aIWorkflowDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.resolve('pr-wf-1', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(/不存在/);
      expect(
        mockPrismaService.aIWorkflowDefinition.update,
      ).not.toHaveBeenCalled();
    });
  });
});
