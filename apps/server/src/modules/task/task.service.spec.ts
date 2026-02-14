import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';

describe('TaskService', () => {
  let service: TaskService;

  const mockPrismaService = {
    project: {
      findFirst: jest.fn(),
      members: {
        some: jest.fn(),
      },
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
        title: 'Test Task',
        description: 'Test Description',
      };

      const mockProject = {
        id: 'project-1',
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
      mockPrismaService.statusDefinition.findFirst.mockResolvedValue(mockStatus);
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.create(createDto, 'user-1');

      expect(result).toBeDefined();
      expect(mockMessageBusService.publish).toHaveBeenCalledWith(
        'task.created',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { projectId: 'non-existent', title: 'Test' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate status when provided', async () => {
      const createDto = {
        projectId: 'project-1',
        title: 'Test Task',
        status: 'invalid-status',
      };

      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
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

    it('should filter by status', async () => {
      const mockProject = {
        id: 'project-1',
        members: [{ userId: 'user-1' }],
      };

      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      await service.findAll(
        'project-1',
        { status: 'todo', page: 1, pageSize: 20 },
        'user-1',
      );

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'todo',
          }),
        }),
      );
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
        { status: 'in_progress' },
        'user-1',
      );

      expect(result).toBeDefined();
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
        service.addDependency('task-1', { dependsOnTaskId: 'task-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
