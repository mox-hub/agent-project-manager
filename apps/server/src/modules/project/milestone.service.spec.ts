import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

/**
 * CAP-A-16 计划-交付轴整合：milestone findAll 含关联发版投影
 * （id/version/status/releasedAt），供前端「里程碑与发布」时间轴聚合。
 */
describe('MilestoneService', () => {
  let service: MilestoneService;

  const mockPrismaService = {
    project: {
      findFirst: vi.fn(),
    },
    milestone: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockMessageBusService = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MessageBusService, useValue: mockMessageBusService },
      ],
    }).compile();

    service = module.get<MilestoneService>(MilestoneService);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('项目不存在（或非成员）时 404', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);
      await expect(service.findAll('p-404', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('返回里程碑含 releases 投影（id/version/status/releasedAt，发布时间倒序）', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrismaService.milestone.findMany.mockResolvedValue([
        {
          id: 'm-1',
          name: 'MVP',
          status: 'reached',
          targetDate: new Date('2026-09-01T00:00:00Z'),
          description: '首个可用版本',
          tasks: [
            {
              issue: {
                id: 'i-1',
                title: '登录',
                status: 'done',
                priority: 'high',
              },
            },
          ],
          releases: [
            {
              id: 'r-2',
              version: '0.2.0',
              status: 'released',
              releasedAt: new Date('2026-09-08T00:00:00Z'),
            },
            {
              id: 'r-1',
              version: '0.1.0',
              status: 'released',
              releasedAt: new Date('2026-09-01T00:00:00Z'),
            },
          ],
        },
        {
          id: 'm-2',
          name: '公开上线',
          status: 'planned',
          targetDate: null,
          description: null,
          tasks: [],
          releases: [],
        },
      ]);

      const result = await service.findAll('p-1', 'user-1');

      expect(result).toHaveLength(2);
      const mvp = result[0];
      expect(mvp.id).toBe('m-1');
      expect(mvp.releases).toEqual([
        {
          id: 'r-2',
          version: '0.2.0',
          status: 'released',
          releasedAt: '2026-09-08T00:00:00.000Z',
        },
        {
          id: 'r-1',
          version: '0.1.0',
          status: 'released',
          releasedAt: '2026-09-01T00:00:00.000Z',
        },
      ]);
      // 发版投影为轻量四字段（不泄漏 notes/gateResult 等重字段）
      expect(Object.keys(mvp.releases[0]).sort()).toEqual(
        ['id', 'releasedAt', 'status', 'version'].sort(),
      );
      // 无日期里程碑排在后面（orderBy targetDate asc 由 prisma 负责，这里验证空态）
      expect(result[1].releases).toEqual([]);
      expect(result[1].targetDate).toBeNull();
    });
  });
});
