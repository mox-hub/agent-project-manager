import { Test, TestingModule } from '@nestjs/testing';
import { DecisionService } from './decision.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('DecisionService', () => {
  let service: DecisionService;

  const mockPrismaService = {
    approvalRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    acceptance: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DecisionService>(DecisionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listPending', () => {
    it('审批映射为 blocking，验收映射为 advisory，且 blocking 排前', async () => {
      mockPrismaService.approvalRequest.findMany.mockResolvedValue([
        {
          id: 'ap-1',
          projectId: 'p1',
          taskId: null,
          requestedAction: '执行 git push',
          reason: null,
          riskLevel: 'high_risk',
          actionType: 'git_write',
          status: 'pending',
          approverPolicy: null,
          requestedAt: new Date('2026-09-01T10:00:00Z'),
          expiresAt: null,
          project: { id: 'p1', name: 'Demo' },
          executionRun: {
            id: 'run-1',
            goal: '发布新版本',
            subjectType: 'platform_ai_member',
            subjectId: 'm-ai-1',
            task: { id: 't-1', title: '发布任务' },
          },
        },
      ]);
      mockPrismaService.acceptance.findMany.mockResolvedValue([
        {
          id: 'ac-1',
          taskId: 't-2',
          title: null,
          description: '请验收',
          status: 'pending',
          completionType: 'artifact',
          priority: 'medium',
          completionEvidence: null,
          completedBy: 'm-ai-1',
          createdBy: 'u-1',
          createdAt: new Date('2026-09-01T09:00:00Z'),
          task: {
            id: 't-2',
            title: '功能开发',
            projectId: 'p1',
            project: { id: 'p1', name: 'Demo' },
          },
        },
      ]);
      mockPrismaService.member.findMany.mockResolvedValue([
        { id: 'm-ai-1', displayName: 'agent-backend', type: 'ai_agent' },
      ]);

      const result = await service.listPending();

      expect(result.total).toBe(2);
      expect(result.blocking).toBe(1);
      expect(result.advisory).toBe(1);
      // blocking 优先排序
      expect(result.items[0].kind).toBe('approval');
      expect(result.items[0].urgency).toBe('blocking');
      expect(result.items[0].id).toBe('approval:ap-1');
      // 提案者名称已回填，且 AI 成员类型收敛正确
      expect(result.items[0].proposer).toEqual({
        type: 'ai_agent',
        id: 'm-ai-1',
        name: 'agent-backend',
      });
      expect(result.items[1].kind).toBe('acceptance');
      expect(result.items[1].urgency).toBe('advisory');
      expect(result.items[1].title).toBe('功能开发');
      expect(result.items[1].contextPath).toBe('/app/acceptance/ac-1');
    });

    it('kind=acceptance 时不查询审批', async () => {
      mockPrismaService.approvalRequest.findMany.mockResolvedValue([]);
      mockPrismaService.acceptance.findMany.mockResolvedValue([]);
      mockPrismaService.member.findMany.mockResolvedValue([]);

      await service.listPending({ kind: 'acceptance' });

      expect(mockPrismaService.approvalRequest.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.acceptance.findMany).toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('聚合 pending/blocking/advisory 计数', async () => {
      mockPrismaService.approvalRequest.count.mockResolvedValue(2);
      mockPrismaService.acceptance.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3);

      const result = await service.summary();

      expect(result).toEqual({
        pending: 6,
        blocking: 2,
        advisory: 4,
        byKind: { approval: 2, acceptance: 4 },
      });
    });
  });
});
