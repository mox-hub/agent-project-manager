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
    },
    projectSequence: {
      upsert: jest.fn(),
    },
    task: {
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
    taskTag: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    taskActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    taskDependency: {
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
    nextShortId: jest.fn().mockResolvedValue('APM-PF-001'),
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
        taskTags: [],
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
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.create(createDto, 'user-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
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
        service.create({ projectId: 'non-existent', moduleCode: 'PF', title: 'Test' }, 'user-1'),
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
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.task.count.mockResolvedValue(2);

      const result = await service.findAll('project-1', {}, 'user-1');

      expect(result.data).toEqual(mockTasks);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by filters JSON', async () => {
      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

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

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['todo'] },
            assigneeId: { in: ['user-2'] },
            iterationId: { in: ['iter-1'] },
            taskTags: { some: { tagId: { in: ['tag-1'] } } },
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
        project: {
          members: [{ userId: 'user-1' }],
        },
      };

      const mockUpdatedTask = {
        id: 'task-1',
        status: 'in_progress',
        assignee: null,
        taskTags: [],
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(mockUpdatedTask);
      mockPrismaService.task.findFirst.mockResolvedValue(mockUpdatedTask);

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
      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
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
      mockPrismaService.task.findUnique.mockResolvedValue(null);

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
        taskId: 'task-1',
        dependsOnTaskId: 'task-2',
        type: 'blocks',
      };

      mockPrismaService.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockDependsOnTask);
      mockPrismaService.taskDependency.findFirst.mockResolvedValue(null);
      mockPrismaService.taskDependency.create.mockResolvedValue(mockDependency);
      mockPrismaService.taskActivity.create.mockResolvedValue({});

      const result = await service.addDependency(
        'task-1',
        { dependsOnTaskId: 'task-2' },
        'user-1',
      );

      expect(result).toEqual(mockDependency);
    });

    it('should throw BadRequestException for self-dependency', async () => {
      await expect(
        service.addDependency(
          'task-1',
          { dependsOnTaskId: 'task-1' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
