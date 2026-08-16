import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    projectTemplate: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    projectHealthSnapshot: {
      findMany: jest.fn(),
    },
    projectAIContext: {
      findUnique: jest.fn(),
    },
    iteration: {
      findMany: jest.fn(),
    },
    milestone: {
      findMany: jest.fn(),
    },
    taskActivity: {
      findMany: jest.fn(),
    },
    externalProjectLink: {
      findMany: jest.fn(),
    },
    projectDocLink: {
      findMany: jest.fn(),
    },
    projectApiDocLink: {
      findMany: jest.fn(),
    },
    repository: {
      findMany: jest.fn(),
    },
  };

  const mockMessageBusService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MessageBusService,
          useValue: mockMessageBusService,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create project without template', async () => {
      const createDto = {
        name: 'Test Project',
        description: 'Test Description',
        type: 'team',
        visibility: 'private',
      };

      const mockProject = {
        id: 'project-1',
        ...createDto,
        status: 'active',
        createdBy: 'user-1',
        members: [],
      };

      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto, 'user-1');

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.create).toHaveBeenCalled();
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'project.created',
        expect.objectContaining({
          projectId: 'project-1',
          userId: 'user-1',
        }),
      );
    });

    it('should create project with template', async () => {
      const createDto = {
        name: 'Test Project',
        description: 'Test Description',
        type: 'team',
        visibility: 'private',
        templateId: 'template-1',
      };

      const mockTemplate = {
        id: 'template-1',
        defaultStatuses: { task: ['todo', 'in_progress'] },
      };

      const mockProject = {
        id: 'project-1',
        ...createDto,
        status: 'active',
        createdBy: 'user-1',
        members: [],
      };

      mockPrismaService.projectTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto, 'user-1');

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.projectTemplate.findUnique).toHaveBeenCalledWith(
        { where: { id: 'template-1' } },
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const mockProjects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];

      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);
      mockPrismaService.project.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 20 }, 'user-1');

      expect(result.items).toEqual(mockProjects);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by search query', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.project.count.mockResolvedValue(0);

      await service.findAll({ q: 'test', page: 1, pageSize: 20 }, 'user-1');

      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test' } },
              { description: { contains: 'test' } },
            ]),
          }),
        }),
      );
    });

    it('should filter by status/type/memberId from filters JSON', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.project.count.mockResolvedValue(0);

      await service.findAll(
        {
          filters: JSON.stringify({
            status: ['active'],
            type: ['team'],
            memberId: ['user-2'],
          }),
          page: 1,
          pageSize: 20,
        },
        'user-1',
      );

      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['active'] },
            type: { in: ['team'] },
            members: { some: { userId: { in: ['user-2'] } } },
          }),
        }),
      );
    });

    it('should filter by priority/workflowStatus/riskLevel/ownerId', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.project.count.mockResolvedValue(0);

      await service.findAll(
        {
          filters: JSON.stringify({
            priority: ['high'],
            workflowStatus: ['in_progress'],
            riskLevel: ['critical'],
            ownerId: ['owner-1'],
          }),
          page: 1,
          pageSize: 20,
        },
        'user-1',
      );

      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: { in: ['high'] },
            workflowStatus: { in: ['in_progress'] },
            riskLevel: { in: ['critical'] },
            ownerId: { in: ['owner-1'] },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        members: [],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);

      const result = await service.findOne('project-1', 'user-1');

      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project with owner role', async () => {
      const mockMember = {
        projectId: 'project-1',
        userId: 'user-1',
        role: 'owner',
      };

      const mockProject = {
        id: 'project-1',
        name: 'Updated Project',
        members: [],
      };

      mockPrismaService.projectMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.project.update.mockResolvedValue(mockProject);

      const result = await service.update(
        'project-1',
        { name: 'Updated Project' },
        'user-1',
      );

      expect(result).toEqual(mockProject);
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'project.updated',
        expect.any(Object),
      );
    });

    it('should throw ForbiddenException for insufficient permissions', async () => {
      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.update('project-1', { name: 'Updated' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archive', () => {
    it('should archive project with owner role', async () => {
      const mockMember = {
        projectId: 'project-1',
        userId: 'user-1',
        role: 'owner',
      };

      const mockProject = {
        id: 'project-1',
        status: 'archived',
      };

      mockPrismaService.projectMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.project.update.mockResolvedValue(mockProject);

      const result = await service.archive('project-1', 'user-1');

      expect(result.status).toBe('archived');
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      await expect(service.archive('project-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getDashboardSummary', () => {
    it('should return aggregated dashboard summary', async () => {
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        projectId: 'project-1',
        userId: 'user-1',
        role: 'member',
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Project One',
        description: null,
        type: 'team',
        status: 'active',
        priority: 'high',
        visibility: 'internal',
        healthStatus: 'on_track',
        riskLevel: 'low',
        color: '#111111',
        icon: 'rocket',
        startDate: null,
        targetDate: null,
        healthScore: 88,
        owner: null,
        members: [],
      });
      mockPrismaService.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Do work',
          status: 'todo',
          priority: 'high',
          dueDate: null,
          assigneeId: null,
          assignee: null,
        },
      ]);
      mockPrismaService.projectHealthSnapshot.findMany.mockResolvedValue([
        { healthScore: 70, breakdown: { ciSuccessRate: 1 } },
        { healthScore: 80, breakdown: { ciSuccessRate: 1 } },
      ]);
      mockPrismaService.projectAIContext.findUnique.mockResolvedValue({
        healthScore: 82,
        complexityLevel: 'medium',
        lifecyclePhase: 'development',
        teamSizeCategory: 'small',
        autoSummary: 'summary',
        lastComputedAt: new Date('2026-03-15T00:00:00.000Z'),
      });
      mockPrismaService.iteration.findMany.mockResolvedValue([]);
      mockPrismaService.milestone.findMany.mockResolvedValue([]);
      mockPrismaService.taskActivity.findMany.mockResolvedValue([]);
      mockPrismaService.externalProjectLink.findMany.mockResolvedValue([]);
      mockPrismaService.projectDocLink.findMany.mockResolvedValue([]);
      mockPrismaService.projectApiDocLink.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.getDashboardSummary('project-1', 'user-1');

      expect(result.projectMeta.id).toBe('project-1');
      expect(result.taskStats.total).toBe(1);
      expect(result.health.currentScore).toBe(80);
      expect(result.health.details).toBeDefined();
      expect(result.health.details).toHaveLength(5);
      expect(result.ai.score).toBe(82);
      expect(result.ai.details).toBeDefined();
      expect(result.analytics).toBeDefined();
      expect(result.analytics.deliveryTimeline.length).toBeGreaterThan(0);
      expect(result.boardPreview).toHaveLength(4);
    });

    it('should return empty-safe summary when project has no tasks', async () => {
      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        projectId: 'project-empty',
        userId: 'user-1',
        role: 'member',
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-empty',
        name: 'Empty',
        description: null,
        type: 'team',
        status: 'active',
        priority: 'medium',
        visibility: 'internal',
        healthStatus: 'at_risk',
        riskLevel: 'medium',
        color: '#000000',
        icon: 'folder',
        startDate: null,
        targetDate: null,
        healthScore: 50,
        owner: null,
        members: [],
      });
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.projectHealthSnapshot.findMany.mockResolvedValue([]);
      mockPrismaService.projectAIContext.findUnique.mockResolvedValue(null);
      mockPrismaService.iteration.findMany.mockResolvedValue([]);
      mockPrismaService.milestone.findMany.mockResolvedValue([]);
      mockPrismaService.taskActivity.findMany.mockResolvedValue([]);
      mockPrismaService.externalProjectLink.findMany.mockResolvedValue([]);
      mockPrismaService.projectDocLink.findMany.mockResolvedValue([]);
      mockPrismaService.projectApiDocLink.findMany.mockResolvedValue([]);
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      const result = await service.getDashboardSummary(
        'project-empty',
        'user-1',
      );

      expect(result.taskStats.total).toBe(0);
      expect(result.teamWorkload).toEqual([]);
      expect(result.activityFeed).toEqual([]);
      expect(
        result.health.details.some(
          (detail: any) =>
            detail.source === 'pending_integration' &&
            detail.available === false,
        ),
      ).toBe(true);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getDashboardSummary('project-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
