import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IssueService } from './issue.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { IssueIdService } from './services/issue-id.service';
import { ActivityService } from '../activity/activity.service';
import { IssueTypeService } from '../issue-type/issue-type.service';
import { ExecutionService } from '../execution/execution.service';

describe('IssueService', () => {
  let service: IssueService;

  const mockPrismaService = {
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      members: {
        some: vi.fn(),
      },
    },
    projectModule: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    projectSequence: {
      upsert: vi.fn(),
    },
    issue: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    statusDefinition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    acceptance: {
      create: vi.fn(),
    },
    acceptanceCriteria: {
      createMany: vi.fn(),
    },
    issueTag: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    tag: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    milestone: {
      findFirst: vi.fn(),
    },
    iteration: {
      findFirst: vi.fn(),
    },
    issueActivity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    issueDependency: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    issueType: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockMessageBusService = {
    publish: vi.fn(),
  };

  const mockIssueIdService = {
    nextShortId: vi.fn().mockResolvedValue('APM-1'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MessageBusService,
          useValue: mockMessageBusService,
        },
        {
          provide: IssueIdService,
          useValue: mockIssueIdService,
        },
        {
          provide: ActivityService,
          useValue: { record: vi.fn() },
        },
        {
          provide: IssueTypeService,
          useValue: {
            resolveIdByKey: vi.fn().mockResolvedValue('issuetype-task'),
          },
        },
        {
          provide: ExecutionService,
          useValue: {
            createIssueExecution: vi.fn(),
            listIssueExecutions: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IssueService>(IssueService);
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    it('切换工单类型：typeId 存在时写入 typeId 并同步遗留 type 列为 key', async () => {
      mockPrismaService.issue.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        status: 'todo',
        typeId: 'type-task',
        type: 'task',
        reporterId: 'user-1',
        assigneeId: 'user-1',
        project: { members: [{ userId: 'user-1' }] },
      });
      mockPrismaService.issueType.findUnique.mockResolvedValue({
        id: 'type-bug',
        key: 'bug',
        fieldSchema: null,
      });
      mockPrismaService.issue.update.mockResolvedValue({ id: 'task-1' });

      await service.update('task-1', { typeId: 'type-bug' }, 'user-1');

      expect(mockPrismaService.issueType.findUnique).toHaveBeenCalledWith({
        where: { id: 'type-bug' },
      });
      expect(mockPrismaService.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ typeId: 'type-bug', type: 'bug' }),
        }),
      );
    });

    it('切换工单类型：typeId 不存在 → BadRequestException 且不写库', async () => {
      mockPrismaService.issue.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        status: 'todo',
        typeId: 'type-task',
        reporterId: 'user-1',
        assigneeId: 'user-1',
        project: { members: [{ userId: 'user-1' }] },
      });
      mockPrismaService.issueType.findUnique.mockResolvedValue(null);

      await expect(
        service.update('task-1', { typeId: 'type-ghost' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.issue.update).not.toHaveBeenCalled();
    });

    it('切换工单类型：typeId 与当前相同 → 幂等跳过（update data 不含 typeId/type）', async () => {
      mockPrismaService.issue.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        status: 'todo',
        typeId: 'type-task',
        type: 'task',
        reporterId: 'user-1',
        assigneeId: 'user-1',
        project: { members: [{ userId: 'user-1' }] },
      });
      mockPrismaService.issueType.findUnique.mockResolvedValue({
        id: 'type-task',
        key: 'task',
        fieldSchema: null,
      });
      mockPrismaService.issue.update.mockResolvedValue({ id: 'task-1' });

      await service.update('task-1', { typeId: 'type-task' }, 'user-1');

      expect(mockPrismaService.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            typeId: expect.anything(),
            type: expect.anything(),
          }),
        }),
      );
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
      mockPrismaService.issueDependency.findMany.mockResolvedValue([]);
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

    // 环检测回归（需求重审 G4，2026-09-17）
    it('should reject direct two-node cycle（B 已依赖 A 时再建 A 依赖 B）', async () => {
      mockPrismaService.issue.findFirst
        .mockResolvedValueOnce({ id: 'task-1', projectId: 'project-1' })
        .mockResolvedValueOnce({
          id: 'task-2',
          title: 'Task B',
          projectId: 'project-1',
        });
      mockPrismaService.issueDependency.findFirst.mockResolvedValue(null);
      mockPrismaService.issueDependency.findMany.mockResolvedValue([
        { issueId: 'task-2', dependsOnIssueId: 'task-1' },
      ]);

      await expect(
        service.addDependency(
          'task-1',
          { dependsOnIssueId: 'task-2' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.issueDependency.create).not.toHaveBeenCalled();
    });

    it('should reject indirect cycle（A→B→C 已存在时建 C→A）', async () => {
      mockPrismaService.issue.findFirst
        .mockResolvedValueOnce({ id: 'task-c', projectId: 'project-1' })
        .mockResolvedValueOnce({
          id: 'task-a',
          title: 'Task A',
          projectId: 'project-1',
        });
      mockPrismaService.issueDependency.findFirst.mockResolvedValue(null);
      mockPrismaService.issueDependency.findMany.mockResolvedValue([
        { issueId: 'task-a', dependsOnIssueId: 'task-b' },
        { issueId: 'task-b', dependsOnIssueId: 'task-c' },
      ]);

      await expect(
        service.addDependency(
          'task-c',
          { dependsOnIssueId: 'task-a' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.issueDependency.create).not.toHaveBeenCalled();
    });

    it('should allow legal chain（无回边不成环）', async () => {
      mockPrismaService.issue.findFirst
        .mockResolvedValueOnce({ id: 'task-a', projectId: 'project-1' })
        .mockResolvedValueOnce({
          id: 'task-b',
          title: 'Task B',
          projectId: 'project-1',
        });
      mockPrismaService.issueDependency.findFirst.mockResolvedValue(null);
      // 已有 task-b dependsOn task-c：从 task-b 出发回不到 task-a，允许
      mockPrismaService.issueDependency.findMany.mockResolvedValue([
        { issueId: 'task-b', dependsOnIssueId: 'task-c' },
      ]);
      mockPrismaService.issueDependency.create.mockResolvedValue({
        id: 'dep-2',
      });
      mockPrismaService.issueActivity.create.mockResolvedValue({});

      await expect(
        service.addDependency(
          'task-a',
          { dependsOnIssueId: 'task-b' },
          'user-1',
        ),
      ).resolves.toEqual({ id: 'dep-2' });
      expect(mockPrismaService.issueDependency.create).toHaveBeenCalledTimes(1);
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
      expect(mockIssueIdService.nextShortId).toHaveBeenCalled();
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
      expect(mockIssueIdService.nextShortId).not.toHaveBeenCalled();
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

  // -------------------------------------------------------------------------
  // P0-8b：导入三无（无事务 / 只校验首行 / 不校验枚举）
  // -------------------------------------------------------------------------
  describe('importTasks（P0-8b）', () => {
    const mockProject = { id: 'project-1', members: [{ userId: 'user-1' }] };

    beforeEach(() => {
      mockPrismaService.statusDefinition.findMany.mockResolvedValue([
        { key: 'todo' },
        { key: 'in_progress' },
      ]);
      mockPrismaService.statusDefinition.findFirst.mockResolvedValue({
        key: 'todo',
      });
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      // $transaction：以 prisma mock 自身作为 tx client
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => unknown) => fn(mockPrismaService),
      );
      mockPrismaService.issue.create.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: `task-${data.shortId}`,
          ...data,
        }),
      );
    });

    it('正常导入：走事务逐行建任务，返回 imported=n 且 typeId 非空', async () => {
      const result = await service.importTasks(
        [
          { projectId: 'project-1', title: 'Task A' },
          {
            projectId: 'project-1',
            title: 'Bug B',
            type: 'bug',
            status: 'in_progress',
            priority: 'high',
          },
        ] as never,
        'user-1',
      );

      expect(result.imported).toBe(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.issue.create).toHaveBeenCalledTimes(2);
      // typeId 与 create() 同源桥接（resolveIdByKey → 'issuetype-task'），
      // 不再出现导入行 typeId=null 的脏数据
      expect(mockPrismaService.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ typeId: 'issuetype-task' }),
        }),
      );
      // 第二行显式 type/status/priority 生效
      expect(mockPrismaService.issue.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'bug',
            status: 'in_progress',
            priority: 'high',
          }),
        }),
      );
    });

    it('非法枚举行（priority=ultra）：400 IMPORT_VALIDATION_FAILED 且全量拒绝（未建任何行）', async () => {
      let captured: BadRequestException | undefined;
      await service
        .importTasks(
          [
            { projectId: 'project-1', title: 'OK Row' },
            { projectId: 'project-1', title: 'Bad Row', priority: 'ultra' },
          ] as never,
          'user-1',
        )
        .catch((err: BadRequestException) => {
          captured = err;
        });

      expect(captured).toBeInstanceOf(BadRequestException);
      const response = captured!.getResponse() as {
        code: string;
        details: { errors: Array<{ row: number; field?: string }> };
      };
      expect(response.code).toBe('IMPORT_VALIDATION_FAILED');
      expect(response.details.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ row: 2, field: 'priority' }),
        ]),
      );
      // 整体回滚语义：校验失败即整批拒绝，事务未开启、一行未建
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockPrismaService.issue.create).not.toHaveBeenCalled();
    });

    it('跨项目行拒绝：第 2 行 projectId 与首行不一致报逐行错误', async () => {
      let captured: BadRequestException | undefined;
      await service
        .importTasks(
          [
            { projectId: 'project-1', title: 'Row 1' },
            { projectId: 'project-2', title: 'Row 2' },
          ] as never,
          'user-1',
        )
        .catch((err: BadRequestException) => {
          captured = err;
        });

      expect(captured).toBeInstanceOf(BadRequestException);
      const response = captured!.getResponse() as {
        details: { errors: Array<{ row: number; field?: string }> };
      };
      expect(response.details.errors).toEqual([
        expect.objectContaining({ row: 2, field: 'projectId' }),
      ]);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('空 title 行报错（field=title）', async () => {
      let captured: BadRequestException | undefined;
      await service
        .importTasks(
          [
            { projectId: 'project-1', title: 'Row 1' },
            { projectId: 'project-1', title: '   ' },
          ] as never,
          'user-1',
        )
        .catch((err: BadRequestException) => {
          captured = err;
        });

      expect(captured).toBeInstanceOf(BadRequestException);
      const response = captured!.getResponse() as {
        details: { errors: Array<{ row: number; field?: string }> };
      };
      expect(response.details.errors).toEqual([
        expect.objectContaining({ row: 2, field: 'title' }),
      ]);
    });

    it('status 须为项目/全局已定义 key，未定义则报逐行错误', async () => {
      mockPrismaService.statusDefinition.findMany.mockResolvedValue([
        { key: 'todo' },
      ]);

      let captured: BadRequestException | undefined;
      await service
        .importTasks(
          [
            { projectId: 'project-1', title: 'Row 1', status: 'ghost' },
          ] as never,
          'user-1',
        )
        .catch((err: BadRequestException) => {
          captured = err;
        });

      expect(captured).toBeInstanceOf(BadRequestException);
      const response = captured!.getResponse() as {
        details: { errors: Array<{ row: number; field?: string }> };
      };
      expect(response.details.errors).toEqual([
        expect.objectContaining({ row: 1, field: 'status' }),
      ]);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // P0-9：acceptanceCriteria 缺 content 的项被静默丢弃
  // -------------------------------------------------------------------------
  describe('create acceptanceCriteria（P0-9）', () => {
    const mockProject = { id: 'project-1', members: [{ userId: 'user-1' }] };
    const mockTask = {
      id: 'task-1',
      projectId: 'project-1',
      status: 'todo',
      assignee: null,
      reporter: null,
      issueTags: [],
    };

    beforeEach(() => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.statusDefinition.findFirst.mockResolvedValue({
        key: 'todo',
      });
      mockPrismaService.issue.create.mockResolvedValue(mockTask);
      mockPrismaService.issue.findFirst.mockResolvedValue(mockTask);
      mockPrismaService.acceptance.create.mockResolvedValue({ id: 'acc-1' });
      mockPrismaService.acceptanceCriteria.createMany.mockResolvedValue({
        count: 1,
      });
    });

    it('Gherkin 形状（缺 content）→ 400 且不落任何任务/契约', async () => {
      await expect(
        service.create(
          {
            projectId: 'project-1',
            moduleCode: 'PF',
            title: 'Gherkin Task',
            acceptanceCriteria: [
              { content: '正常标准' },
              { title: '场景', given: '当', when: '则', then: '那么' },
            ] as never,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);

      // 校验前置于落库：任务与验收契约均未创建
      expect(mockPrismaService.issue.create).not.toHaveBeenCalled();
      expect(mockPrismaService.acceptance.create).not.toHaveBeenCalled();
    });

    it('message 明确指出第 N 项缺少 content（VALIDATION_ERROR）', async () => {
      let captured: BadRequestException | undefined;
      await service
        .create(
          {
            projectId: 'project-1',
            moduleCode: 'PF',
            title: 'T',
            acceptanceCriteria: [
              { content: 'a' },
              {} as never,
              { content: 'b' },
            ],
          },
          'user-1',
        )
        .catch((err: BadRequestException) => {
          captured = err;
        });

      expect(captured).toBeInstanceOf(BadRequestException);
      const response = captured!.getResponse() as {
        code: string;
        message: string;
      };
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(response.message).toContain('acceptanceCriteria 第 2 项');
      expect(response.message).toContain('content');
    });

    it('合法 acceptanceCriteria 仍正常落契约+标准', async () => {
      const result = await service.create(
        {
          projectId: 'project-1',
          moduleCode: 'PF',
          title: 'With Criteria',
          acceptanceCriteria: [
            { content: '登录成功跳转工作台', criteriaType: 'functional' },
          ],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.acceptance.create).toHaveBeenCalledTimes(1);
      expect(
        mockPrismaService.acceptanceCriteria.createMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              content: '登录成功跳转工作台',
              criteriaType: 'functional',
            }),
          ],
        }),
      );
    });
  });
});
