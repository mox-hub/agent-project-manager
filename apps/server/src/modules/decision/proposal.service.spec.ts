import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ContractBindingService } from '../contract/contract-binding.service';
import { computeProposalFingerprint } from './decision-fingerprint';

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

  const mockContractBindings = {
    resolveConflict: vi.fn(),
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
        { provide: ContractBindingService, useValue: mockContractBindings },
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

    it('resolution accept：任务拨到 done 终态并落决议（回归：entityType 从 payload 自解析，前端不传）', async () => {
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
      mockPrismaService.issue.update.mockResolvedValue({ id: 't-1' });
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...pendingPlan,
        status: 'accepted',
      });

      const result = await service.resolve('pr-1', { action: 'accept' }, 'u-1');

      expect(mockPrismaService.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-1' },
          data: expect.objectContaining({ status: 'done' }),
        }),
      );
      expect(result.status).toBe('accepted');
    });

    it('resolution accept 但 payload 缺 entityType（如历史示例卡误用 kind）→ 400 且带可读 message', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingPlan,
        kind: 'resolution',
        payload: { decision: '后端框架最终采用 X', status: 'closed' },
      });

      await expect(
        service.resolve('pr-1', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(/entityType/);
      expect(mockPrismaService.issue.update).not.toHaveBeenCalled();
      expect(mockPrismaService.decisionProposal.update).not.toHaveBeenCalled();
    });
  });

  describe('contract_conflict accept（契约冲突裁决 → ContractBindingService.resolveConflict）', () => {
    const pendingConflict = {
      id: 'pr-cc-1',
      kind: 'contract_conflict',
      status: 'pending',
      projectId: 'p1',
      issueId: null,
      title: '契约托管区冲突：AGENTS.md',
      detail: null,
      payload: { bindingId: 'b-1', filePath: 'AGENTS.md' },
    };

    const acceptAndResolve = async (
      conflictAction: 'accept_file' | 'accept_db' | 'detach',
    ) => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingConflict,
      );
      mockContractBindings.resolveConflict.mockResolvedValue(undefined);
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...pendingConflict,
        status: 'accepted',
      });
      return service.resolve(
        'pr-cc-1',
        { action: 'accept', conflictAction },
        'u-1',
      );
    };

    it.each(['accept_file', 'accept_db', 'detach'] as const)(
      '%s：按 conflictAction 映射调用 resolveConflict 并正常收口提案',
      async (conflictAction) => {
        const result = await acceptAndResolve(conflictAction);
        expect(mockContractBindings.resolveConflict).toHaveBeenCalledWith(
          'b-1',
          conflictAction,
        );
        expect(result.status).toBe('accepted');
        expect(
          mockPrismaService.decisionProposal.update,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'accepted' }),
          }),
        );
      },
    );

    it('缺 conflictAction → 400，不裁决不改提案状态', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingConflict,
      );

      await expect(
        service.resolve('pr-cc-1', { action: 'accept' }, 'u-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockContractBindings.resolveConflict).not.toHaveBeenCalled();
      expect(mockPrismaService.decisionProposal.update).not.toHaveBeenCalled();
    });

    it('非法 conflictAction → 400 且 message 列出三种合法动作', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingConflict,
      );

      await expect(
        service.resolve(
          'pr-cc-1',
          { action: 'accept', conflictAction: 'overwrite' as never },
          'u-1',
        ),
      ).rejects.toThrow(/accept_file \| accept_db \| detach/);
      expect(mockContractBindings.resolveConflict).not.toHaveBeenCalled();
    });

    it('payload 缺 bindingId → 400', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...pendingConflict,
        payload: { filePath: 'AGENTS.md' },
      });

      await expect(
        service.resolve(
          'pr-cc-1',
          { action: 'accept', conflictAction: 'detach' },
          'u-1',
        ),
      ).rejects.toThrow(/bindingId/);
      expect(mockContractBindings.resolveConflict).not.toHaveBeenCalled();
    });

    it('裁决业务失败（普通 Error，如派生型 accept_db）→ 收敛为 400 可读 message，提案保持 pending', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingConflict,
      );
      mockContractBindings.resolveConflict.mockRejectedValue(
        new Error('契约文件缺失: CHANGELOG.md'),
      );

      await expect(
        service.resolve(
          'pr-cc-1',
          { action: 'accept', conflictAction: 'accept_db' },
          'u-1',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resolve(
          'pr-cc-1',
          { action: 'accept', conflictAction: 'accept_db' },
          'u-1',
        ),
      ).rejects.toThrow(/契约冲突裁决失败：契约文件缺失/);
      expect(mockPrismaService.decisionProposal.update).not.toHaveBeenCalled();
    });

    it('绑定不存在（HttpException 404）→ 原样透传，不二次包装', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingConflict,
      );
      mockContractBindings.resolveConflict.mockRejectedValue(
        new NotFoundException('契约绑定不存在: b-1'),
      );

      await expect(
        service.resolve(
          'pr-cc-1',
          { action: 'accept', conflictAction: 'detach' },
          'u-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('reject：仅留痕不裁决', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        pendingConflict,
      );
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...pendingConflict,
        status: 'rejected',
      });

      const result = await service.resolve(
        'pr-cc-1',
        { action: 'reject', reason: '稍后人工比对' },
        'u-1',
      );

      expect(mockContractBindings.resolveConflict).not.toHaveBeenCalled();
      expect(result.status).toBe('rejected');
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

  describe('CAP-C-04：批准绑定内容指纹', () => {
    const fingerprintProposal = {
      id: 'pr-fp-1',
      kind: 'spend',
      status: 'pending',
      projectId: 'p1',
      issueId: null,
      title: '追加预算？',
      detail: null,
      payload: { budgetType: 'tokens', newValue: 1000 },
    };

    it('accept 落库 approvedFingerprint = 批准时内容指纹；reject 不落', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        fingerprintProposal,
      );
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'p1',
        config: {},
      });
      mockPrismaService.project.update.mockResolvedValue({ id: 'p1' });
      mockPrismaService.decisionProposal.update.mockImplementation(
        (args: { where: { id: string }; data: Record<string, unknown> }) =>
          Promise.resolve({ id: args.where.id, ...args.data }),
      );

      await service.resolve('pr-fp-1', { action: 'accept' }, 'u-1');

      const acceptData = mockPrismaService.decisionProposal.update.mock
        .calls[0][0].data as Record<string, unknown>;
      expect(acceptData.approvedFingerprint).toBe(
        computeProposalFingerprint(fingerprintProposal),
      );

      mockPrismaService.decisionProposal.update.mockClear();
      await service.resolve(
        'pr-fp-1',
        { action: 'reject', reason: '不批' },
        'u-1',
      );
      const rejectData = mockPrismaService.decisionProposal.update.mock
        .calls[0][0].data as Record<string, unknown>;
      expect(rejectData.approvedFingerprint).toBeUndefined();
    });

    it('expectedFingerprint 与当前内容失配 → 409，不执行 applier 不落决议', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        fingerprintProposal,
      );

      await expect(
        service.resolve(
          'pr-fp-1',
          { action: 'accept', expectedFingerprint: '0'.repeat(64) },
          'u-1',
        ),
      ).rejects.toThrow(ConflictException);
      // 副作用与决议均未发生：批准没有被沿用到已变更的内容上
      expect(mockPrismaService.project.update).not.toHaveBeenCalled();
      expect(mockPrismaService.decisionProposal.update).not.toHaveBeenCalled();
    });

    it('expectedFingerprint 与当前内容一致 → 正常决议', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(
        fingerprintProposal,
      );
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'p1',
        config: {},
      });
      mockPrismaService.project.update.mockResolvedValue({ id: 'p1' });
      mockPrismaService.decisionProposal.update.mockResolvedValue({
        ...fingerprintProposal,
        status: 'accepted',
      });

      await expect(
        service.resolve(
          'pr-fp-1',
          {
            action: 'accept',
            expectedFingerprint:
              computeProposalFingerprint(fingerprintProposal),
          },
          'u-1',
        ),
      ).resolves.toMatchObject({ status: 'accepted' });
    });
  });

  describe('get（CAP-C-04：内容指纹与批准过期态）', () => {
    const proposal = {
      id: 'pr-get-1',
      kind: 'spend',
      status: 'pending',
      projectId: 'p1',
      issueId: null,
      title: '追加预算？',
      detail: null,
      payload: { budgetType: 'tokens', newValue: 1000 },
      approvedFingerprint: null,
      resolution: null,
    };

    it('pending 提案：contentFingerprint 实时计算，approvalStale=false', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(proposal);

      const result = await service.get('pr-get-1');

      expect(result.contentFingerprint).toBe(
        computeProposalFingerprint(proposal),
      );
      expect(result.approvalStale).toBe(false);
    });

    it('accepted 且内容已变更：approvalStale=true（旧批准不再可信）', async () => {
      const accepted = {
        ...proposal,
        status: 'accepted',
        approvedFingerprint: computeProposalFingerprint(proposal),
      };
      // 模拟批准后内容被实质变更：当前 title 与批准时不同
      const mutated = { ...accepted, title: '追加预算（改）？' };
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue(mutated);

      const result = await service.get('pr-get-1');

      expect(result.approvalStale).toBe(true);
    });

    it('存量已决议行（approvedFingerprint=null）不误报过期', async () => {
      mockPrismaService.decisionProposal.findUnique.mockResolvedValue({
        ...proposal,
        status: 'accepted',
        title: '批准后被改过的标题',
      });

      const result = await service.get('pr-get-1');

      expect(result.approvalStale).toBe(false);
    });
  });
});
