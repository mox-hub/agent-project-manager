import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { TaskIdService } from './services/task-id.service';
import { ActivityService } from '../activity/activity.service';
import { IssueTypeService } from '../issue-type/issue-type.service';

describe('TaskService', () => {
  let service: TaskService;

  const mockPrismaService = {
    project: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      members: {
        some: jest.fn(),
      },
    },
    projectModule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    projectSequence: {
      upsert: jest.fn(),
    },
    issue: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    statusDefinition: {
      findFirst: jest.fn(),
    },
    issueTag: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    tag: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    milestone: {
      findFirst: jest.fn(),
    },
    iteration: {
      findFirst: jest.fn(),
    },
    issueActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    issueDependency: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
  };

  const mockMessageBusService = {
    publish: jest.fn(),
  };

  const mockTaskIdService = {
    nextShortId: jest.fn().mockResolvedValue('APM-1'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MessageBusService,
          useValue: mockMessageBusService,
        },
        {
          provide: TaskIdService,
          useValue: mockTaskIdService,
        },
        {
          provide: ActivityService,
          useValue: { record: jest.fn() },
        },
        {
          provide: IssueTypeService,
          useValue: {
            resolveIdByKey: jest.fn().mockResolvedValue('issuetype-task'),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create task with default status', async () => {
      const createDto = {
        projectId: 'project-1',
        moduleCode: 'PF',
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2026-03-10T00:00:00Z',
      };

      const mockProject = {
        id: 'project-1',
        projectCode: 'APM',
        members: [{ userId: 'user-1' }],
      };

      const mockStatus = {
        id: 'status-1',
        key: 'todo',
        type: 'task',
      };

      const mockTask = {
        id: 'task-1',
        ...createDto,
        status: 'todo',
        projectId: 'project-1',
        assignee: null,
        reporter: null,
        issueTags: [],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.projectModule.findUnique.mockResolvedValue({
        id: 'mod-1',
        projectId: 'project-1',
        code: 'PF',
        name: 'Platform',
      });
      mockPrismaService.projectSequence.upsert.mockResolvedValue({
        projectId: 'project-1',
        lastSeq: 1,
      });
      mockPrismaService.statusDefinition.findFirst.mockResolvedValue(
        mockStatus,
      );
      mockPrismaService.issue.create.mockResolvedValue(mockTask);
      mockPrismaService.issue.findFirst.mockResolvedValue(mockTask);

      const result = await service.create(createDto, 'user-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
          }),
        }),
      );
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'task.created',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { projectId: 'non-existent', moduleCode: 'PF', title: 'Test' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate status when provided', async () => {
      const createDto = {
        projectId: 'project-1',
        moduleCode: 'PF',
        title: 'Test Task',
        status: 'invalid-status',
      };

      const mockProject = {
        id: 'project-1',
        projectCode: 'APM',
        members: [{ userId: 'user-1' }],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.projectModule.findUnique.mockResolvedValue({
        id: 'mod-1',
        projectId: 'project-1',
        code: 'PF',
        name: 'Platform',
      });
      mockPrismaService.projectSequence.upsert.mockResolvedValue({
        projectId: 'project-1',
        lastSeq: 1,
      });
      mockPrismaService.statusDefinition.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'Task 1' },
        { id: 'task-2', title: 'Task 2' },
      ];

      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.issue.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.issue.count.mockResolvedValue(2);

      const result = await service.findAll('project-1', {}, 'user-1');

      expect(result.data).toHaveLength(mockTasks.length);
      expect(result.data.map((t) => t.id)).toEqual(mockTasks.map((t) => t.id));
      expect(result.meta.total).toBe(2);
    });

    it('should filter by filters JSON', async () => {
      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.issue.findMany.mockResolvedValue([]);
      mockPrismaService.issue.count.mockResolvedValue(0);

      await service.findAll(
        'project-1',
        {
          filters: JSON.stringify({
            status: ['todo'],
            assigneeId: ['user-2'],
            iterationId: ['iter-1'],
            tag: ['tag-1'],
          }),
          page: 1,
          pageSize: 20,
        },
        'user-1',
      );

      expect(mockPrismaService.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['todo'] },
            assigneeId: { in: ['user-2'] },
            iterationId: { in: ['iter-1'] },
            issueTags: { some: { tagId: { in: ['tag-1'] } } },
          }),
        }),
      );
    });

    it('should throw on invalid filters JSON', async () => {
      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      };
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);

      await expect(
        service.findAll('project-1', { filters: '{invalid-json' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update task', async () => {
      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        status: 'todo',
        reporterId: 'user-1',
        assigneeId: 'user-1',
        project: {
          members: [{ userId: 'user-1' }],
        },
      };

      const mockUpdatedTask = {
        id: 'task-1',
        status: 'in_progress',
        assignee: null,
        issueTags: [],
      };

      mockPrismaService.issue.findFirst.mockResolvedValue(mockTask);
      mockPrismaService.issue.update.mockResolvedValue(mockUpdatedTask);

      const result = await service.update(
        'task-1',
        {
          status: 'in_progress',
          startDate: '2026-03-12T00:00:00Z',
          dueDate: '2026-03-15T00:00:00Z',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
            dueDate: expect.any(Date),
          }),
        }),
      );
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'task.updated',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when task not found', async () => {
      mockPrismaService.issue.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'Updated' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addDependency', () => {
    it('should add task dependency', async () => {
      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
      };

      const mockDependsOnTask = {
        id: 'task-2',
        title: 'Dependency Task',
        projectId: 'project-1',
      };

      const mockDependency = {
        id: 'dep-1',
        issueId: 'task-1',
        dependsOnIssueId: 'task-2',
        type: 'blocks',
      };

      mockPrismaService.issue.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockDependsOnTask);
      mockPrismaService.issueDependency.findFirst.mockResolvedValue(null);
      mockPrismaService.issueDependency.create.mockResolvedValue(
        mockDependency,
      );
      mockPrismaService.issueActivity.create.mockResolvedValue({});

      const result = await service.addDependency(
        'task-1',
        { dependsOnIssueId: 'task-2' },
        'user-1',
      );

      expect(result).toEqual(mockDependency);
    });

    it('should throw BadRequestException for self-dependency', async () => {
      await expect(
        service.addDependency(
          'task-1',
          { dependsOnIssueId: 'task-1' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // e2e 已知缺陷回归（frontend/e2e/README.md 缺陷 1/2/3/5）
  // -------------------------------------------------------------------------
  describe('inbox / parent / move / tag-name 回归', () => {
    const baseTask = {
      id: 'task-1',
      projectId: 'project-1',
      status: 'todo',
      reporterId: 'user-1',
      assigneeId: null,
      milestoneId: null,
      iterationId: null,
      externalProvider: null,
      project: { members: [{ userId: 'user-1' }] },
      assignee: null,
      issueTags: [],
    };

    it('缺陷1: 无 projectId 创建落为无项目任务（projectId=null）且拿到短 ID', async () => {
      const mockTask = {
        ...baseTask,
        projectId: null,
        title: 'No Project Task',
      };
      mockPrismaService.issue.create.mockResolvedValue(mockTask);
      mockPrismaService.issue.findFirst.mockResolvedValue(mockTask);

      const result = await service.create(
        { title: 'No Project Task' },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockTaskIdService.nextShortId).toHaveBeenCalled();
      expect(mockPrismaService.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId: null }),
        }),
      );
    });

    it('缺陷3: 仅带 parentIssueId 创建时从父任务继承项目', async () => {
      mockPrismaService.issue.findUnique.mockResolvedValue({
        projectId: 'project-1',
      });
      mockPrismaService.project.findFirst.mockResolvedValue({
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      });
      const mockTask = { ...baseTask, parentIssueId: 'parent-1' };
      mockPrismaService.issue.create.mockResolvedValue(mockTask);
      mockPrismaService.issue.findFirst.mockResolvedValue(mockTask);

      await service.create(
        { title: 'Child', parentIssueId: 'parent-1' },
        'user-1',
      );

      expect(mockPrismaService.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'project-1',
            parentIssueId: 'parent-1',
          }),
        }),
      );
    });

    it('缺陷2: update 接受 projectId 移动任务且不重生成短 ID', async () => {
      mockPrismaService.issue.findFirst.mockResolvedValue(baseTask);
      mockPrismaService.project.findFirst.mockResolvedValue({
        id: 'project-2',
      });
      mockPrismaService.issue.update.mockResolvedValue({
        ...baseTask,
        projectId: 'project-2',
      });

      await service.update('task-1', { projectId: 'project-2' }, 'user-1');

      expect(mockPrismaService.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'project-2',
          }),
        }),
      );
      expect(mockTaskIdService.nextShortId).not.toHaveBeenCalled();
    });

    it('缺陷2: 移动到非成员项目抛 NotFoundException', async () => {
      mockPrismaService.issue.findFirst.mockResolvedValue(baseTask);
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update('task-1', { projectId: 'project-x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('缺陷3: update 接受 parentIssueId 建立父子关系', async () => {
      mockPrismaService.issue.findFirst
        .mockResolvedValueOnce(baseTask) // 目标任务
        .mockResolvedValueOnce({ id: 'parent-2', parentIssueId: null }); // 父任务
      mockPrismaService.issue.update.mockResolvedValue(baseTask);

      await service.update('task-1', { parentIssueId: 'parent-2' }, 'user-1');

      expect(mockPrismaService.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parentIssueId: 'parent-2' }),
        }),
      );
    });

    it('缺陷3: update 拒绝以自己作为父任务', async () => {
      mockPrismaService.issue.findFirst.mockResolvedValue(baseTask);

      await expect(
        service.update('task-1', { parentIssueId: 'task-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('缺陷5: create 支持按名字提交标签（匹配/按需创建）', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue({
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      });
      const mockTask = { ...baseTask, title: 'Tagged' };
      mockPrismaService.issue.create.mockResolvedValue(mockTask);
      mockPrismaService.issue.findFirst.mockResolvedValue(mockTask);
      // 'frontend' 不存在 → 创建; 'urgent' 已存在 → 复用
      mockPrismaService.tag.findUnique.mockResolvedValue(null);
      mockPrismaService.tag.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'tag-2' });
      mockPrismaService.tag.create.mockResolvedValue({ id: 'tag-1' });
      mockPrismaService.issueTag.create.mockResolvedValue({});

      await service.create(
        {
          projectId: 'project-1',
          title: 'Tagged',
          tags: ['frontend', 'urgent'],
        },
        'user-1',
      );

      expect(mockPrismaService.tag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'frontend' }),
      });
      expect(mockPrismaService.issueTag.create).toHaveBeenCalledTimes(2);
    });
  });
});
