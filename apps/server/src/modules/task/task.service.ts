import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import {
  ClaimTaskDto,
  AiSuggestionDto,
  AiExecutionResultDto,
  AiDiscoverQueryDto,
} from './dto/claim-task.dto';
import { AssignTaskAgentDto } from './dto/assign-task-agent.dto';
import { CreateTaskExecutionDto } from './dto/create-task-execution.dto';
import { ConfirmTaskExecutionDto } from './dto/confirm-task-execution.dto';
import { parseFilterQuery } from '../../common/utils/filter-query.util';
import { TaskIdService } from './services/task-id.service';
import { ActivityChange, ActivityService } from '../activity/activity.service';

const TASK_FILTER_KEYS = [
  'status',
  'assigneeId',
  'iterationId',
  'tag',
] as const;

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly taskIdService: TaskIdService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * 任务可见性条件: 项目成员, 或未绑定项目时的 reporter / assignee。
   * 用作 findFirst 的 where.OR 列表。
   */
  private visibilityOr(userId: string): Prisma.TaskWhereInput[] {
    return [
      {
        project: {
          members: {
            some: { userId },
          },
        },
      },
      {
        assigneeId: userId,
        projectId: null,
      },
      {
        reporterId: userId,
        projectId: null,
      },
    ];
  }

  /** 任务/Bug 统一落动态：entityType 依据任务类型区分，便于分实体追踪 */
  private recordTaskActivity(
    task: {
      id: string;
      type?: string | null;
      projectId?: string | null;
    },
    input: {
      actorId?: string | null;
      type: string;
      summary?: string | null;
      content?: string | null;
      changes?: ActivityChange[] | null;
      source?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return this.activityService.record({
      entityType: task.type === 'bug' ? 'bug' : 'task',
      entityId: task.id,
      projectId: task.projectId ?? null,
      ...input,
    });
  }

  /**
   * 解析任务上下文中的项目: 显式传入则使用, 否则 fallback 到 inbox。
   * 同时处理短 ID 的预解析, 避免两次访问 ProjectSequence。
   */
  private async resolveProjectContext(createTaskDto: CreateTaskDto): Promise<{
    projectId: string | null;
    shortId: string | null;
  }> {
    if (!createTaskDto.projectId) {
      // 走 inbox fallback, 同时预解析短 ID
      const inboxProjectId = await this.taskIdService.ensureInboxProject();
      const shortId = await this.taskIdService.nextShortId(inboxProjectId);
      return { projectId: inboxProjectId, shortId };
    }
    return { projectId: createTaskDto.projectId, shortId: null };
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private async ensureProjectMember(projectId: string | null, userId: string) {
    if (!projectId) {
      throw new BadRequestException('Task is not associated with a project');
    }
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return member;
  }

  private async ensureProjectApprover(projectId: string, userId: string) {
    const member = await this.ensureProjectMember(projectId, userId);

    if (!['owner', 'maintainer'].includes(member.role)) {
      throw new ForbiddenException(
        'Only owner or maintainer can approve AI actions',
      );
    }

    return member;
  }

  private async ensureAssignableAgent(
    projectId: string | null,
    agentId: string,
  ) {
    if (!projectId) {
      throw new BadRequestException('Task is not associated with a project');
    }
    const agent = await this.prisma.agentIdentity.findFirst({
      where: {
        id: agentId,
        status: 'active',
        OR: [{ projectId }, { projectId: null }],
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found or unavailable`);
    }

    return agent;
  }

  private async enrichTaskWithAgent<T extends { aiAgentId?: string | null }>(
    task: T,
  ): Promise<
    T & {
      aiAgent?: {
        id: string;
        name: string;
        type: string;
        status: string;
      } | null;
    }
  > {
    if (!task.aiAgentId) {
      return { ...task, aiAgent: null };
    }

    const agent = await this.prisma.agentIdentity.findUnique({
      where: { id: task.aiAgentId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
      },
    });

    return {
      ...task,
      aiAgent: agent,
    };
  }

  private async enrichTasksWithAgents<T extends { aiAgentId?: string | null }>(
    tasks: T[],
  ): Promise<
    Array<
      T & {
        aiAgent?: {
          id: string;
          name: string;
          type: string;
          status: string;
        } | null;
      }
    >
  > {
    const agentIds = Array.from(
      new Set(tasks.map((task) => task.aiAgentId).filter(Boolean)),
    ) as string[];

    if (agentIds.length === 0) {
      return tasks.map((task) => ({ ...task, aiAgent: null }));
    }

    const agents = await this.prisma.agentIdentity.findMany({
      where: { id: { in: agentIds } },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
      },
    });

    const agentMap = new Map<string, (typeof agents)[number]>(
      agents.map((agent) => [agent.id, agent]),
    );

    return tasks.map((task) => ({
      ...task,
      aiAgent: task.aiAgentId ? (agentMap.get(task.aiAgentId) ?? null) : null,
    }));
  }

  private async buildTaskExecutionContext(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            workflowStatus: true,
            riskLevel: true,
            aiContext: true,
          },
        },
        iteration: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        taskTags: {
          include: {
            tag: true,
          },
        },
        dependencies: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const recentActivities = await this.prisma.taskActivity.findMany({
      where: { taskId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        summary: true,
        timestamp: true,
        source: true,
      },
    });

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeType: task.assigneeType,
        aiAgentId: task.aiAgentId,
        aiExecutionSpec: task.aiExecutionSpec,
        aiExecutionStatus: task.aiExecutionStatus,
        tags: task.taskTags.map((item) => item.tag.name),
        dependencies: task.dependencies.map((item) => ({
          id: item.dependsOnTask.id,
          title: item.dependsOnTask.title,
          status: item.dependsOnTask.status,
        })),
      },
      project: task.project
        ? {
            id: task.project.id,
            name: task.project.name,
            description: task.project.description,
            status: task.project.status,
            workflowStatus: task.project.workflowStatus,
            riskLevel: task.project.riskLevel,
            aiContext: task.project.aiContext,
          }
        : null,
      iteration: task.iteration,
      recentActivities,
    };
  }

  async create(createTaskDto: CreateTaskDto, userId: string) {
    // Resolve effective project: 当 projectId 为空时, 走 inbox fallback
    const { projectId, shortId: resolvedShortId } =
      await this.resolveProjectContext(createTaskDto);

    // Verify project exists and user has access (跳过 inbox fallback 的项目)
    if (createTaskDto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: createTaskDto.projectId,
          members: {
            some: {
              userId,
            },
          },
        },
      });

      if (!project) {
        throw new NotFoundException(
          `Project ${createTaskDto.projectId} not found`,
        );
      }
    }

    // Verify parent task if provided
    if (createTaskDto.parentTaskId) {
      const parentTask = await this.prisma.task.findFirst({
        where: {
          id: createTaskDto.parentTaskId,
          projectId,
        },
      });

      if (!parentTask) {
        throw new NotFoundException('Parent task not found');
      }
    }

    // Get default status if not provided
    // First try project-specific status, then global status
    let status = createTaskDto.status;
    if (!status) {
      // Try project-specific status first
      let defaultStatus = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          projectId,
        },
        orderBy: { order: 'asc' },
      });

      // Fallback to global status
      if (!defaultStatus) {
        defaultStatus = await this.prisma.statusDefinition.findFirst({
          where: {
            type: 'task',
            projectId: null,
          },
          orderBy: { order: 'asc' },
        });
      }

      status = defaultStatus?.key || 'todo';
    } else {
      // Validate status exists (project-specific or global)
      const statusDef = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          key: status,
          OR: [{ projectId }, { projectId: null }],
        },
      });

      if (!statusDef) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
    }

    // 生成短 ID: projectId 缺失时由 service 自动 fallback 到 inbox
    const shortId =
      resolvedShortId ??
      (await this.taskIdService.nextShortId(
        projectId,
        createTaskDto.moduleCode,
      ));

    // Create task
    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: createTaskDto.title,
        description: createTaskDto.description,
        status,
        priority: createTaskDto.priority || 'medium',
        assigneeId: createTaskDto.assigneeId,
        assigneeType:
          createTaskDto.assigneeType ||
          (createTaskDto.aiAgentId ? 'ai_agent' : 'user'),
        aiAgentId: createTaskDto.aiAgentId,
        reporterId: createTaskDto.reporterId || userId,
        iterationId: createTaskDto.iterationId,
        parentTaskId: createTaskDto.parentTaskId,
        startDate: createTaskDto.startDate
          ? new Date(createTaskDto.startDate)
          : null,
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
        estimate: createTaskDto.estimate,
        // Task/Bug 类型区分
        type: createTaskDto.type || 'task',
        // 短 ID
        shortId,
        // Bug 专用字段
        severity: createTaskDto.severity,
        bugReproducibility: createTaskDto.bugReproducibility,
        bugStepsToReproduce: createTaskDto.bugStepsToReproduce,
        bugEnvironment: createTaskDto.bugEnvironment,
        bugExpectedResult: createTaskDto.bugExpectedResult,
        bugActualResult: createTaskDto.bugActualResult,
        // 里程碑关联
        milestoneId: createTaskDto.milestoneId,
        // 待办事项
        todoItems: createTaskDto.todoItems
          ? (createTaskDto.todoItems as unknown as Prisma.InputJsonValue)
          : undefined,
        // AI Execution (from stash)
        aiExecutionSpec: createTaskDto.aiExecutionSpec
          ? this.toJsonValue(createTaskDto.aiExecutionSpec)
          : undefined,
        aiExecutionStatus: createTaskDto.aiAgentId ? 'pending' : null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        taskTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Add tags if provided
    if (createTaskDto.tags && createTaskDto.tags.length > 0) {
      await Promise.all(
        createTaskDto.tags.map((tagId) =>
          this.prisma.taskTag.create({
            data: {
              taskId: task.id,
              tagId,
              projectId,
            },
          }),
        ),
      );
    }

    // Create activity record (无项目时 projectId 为 null)
    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'created',
      summary: `Task created`,
      source: 'user',
      changes: [{ field: 'status', newValue: task.status }],
    });

    // Publish event
    this.messageBus.publish('task.created', {
      taskId: task.id,
      projectId: task.projectId,
      userId,
      task,
    });

    return this.findOne(task.id, userId);
  }

  async findAll(projectId: string, query: TaskQueryDto, userId: string) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const { filters, q, page, pageSize } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;
    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;
    const iterationIds = parsedFilters.iterationId;
    const tags = parsedFilters.tag;

    const where: any = {
      projectId,
    };

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }

    if (iterationIds && iterationIds.length > 0) {
      where.iterationId = { in: iterationIds };
    }

    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    if (tags && tags.length > 0) {
      where.taskTags = {
        some: {
          tagId: { in: tags },
        },
      };
    }

    // 子任务过滤：通过 parentTaskId 查询子任务
    if (query.parentTaskId) {
      where.parentTaskId = query.parentTaskId;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          taskTags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              subTasks: true,
              dependencies: true,
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    // 手动加载里程碑信息
    const taskIds = tasks.map((t) => t.id);
    const milestoneIds = tasks
      .filter((t) => t.milestoneId)
      .map((t) => t.milestoneId!);
    const milestones =
      milestoneIds.length > 0
        ? await this.prisma.milestone.findMany({
            where: { id: { in: milestoneIds } },
            select: { id: true, name: true, status: true },
          })
        : [];
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

    const tasksWithMilestones = tasks.map((task) => ({
      ...task,
      milestone: task.milestoneId
        ? milestoneMap.get(task.milestoneId) || null
        : null,
    }));

    return {
      data: await this.enrichTasksWithAgents(tasksWithMilestones),
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  /**
   * 通过 shortId 查找任务
   */
  async findByShortId(shortId: string, userId: string) {
    // 1. 先通过 shortId 找到任务
    const task = await this.prisma.task.findFirst({
      where: { shortId },
    });

    if (!task) {
      throw new NotFoundException(`Task with shortId ${shortId} not found`);
    }

    // 2. 校验用户权限
    const hasAccess = await this.hasTaskAccess(task.id, userId);
    if (!hasAccess) {
      throw new NotFoundException(`Task ${shortId} not found`);
    }

    // 3. 返回完整任务详情
    return this.findOne(task.id, userId);
  }

  /**
   * 校验用户是否有任务访问权限
   */
  private async hasTaskAccess(
    taskId: string,
    userId: string,
  ): Promise<boolean> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: this.visibilityOr(userId),
      },
      select: { id: true },
    });
    return !!task;
  }

  async findOne(id: string, userId: string) {
    // 任务可能没有 projectId (未绑定项目 / inbox), 此时改用 reporterId/assigneeId 校验权限
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        OR: this.visibilityOr(userId),
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        parentTask: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        subTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        taskTags: {
          include: {
            tag: true,
          },
        },
        dependencies: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        blockedBy: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        iteration: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // 手动加载里程碑信息
    let milestone = null;
    if (task.milestoneId) {
      milestone = await this.prisma.milestone.findUnique({
        where: { id: task.milestoneId },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });
    }

    // 加载 AI Agent 信息
    const enrichedTask = await this.enrichTaskWithAgent(task);

    return {
      ...enrichedTask,
      milestone,
    };
  }

  async findBugs(projectId: string, query: TaskQueryDto, userId: string) {
    const { filters, q, page, pageSize } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;

    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;
    const iterationIds = parsedFilters.iterationId;

    const where: any = {
      projectId,
      type: 'bug',
    };

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }

    if (iterationIds && iterationIds.length > 0) {
      where.iterationId = { in: iterationIds };
    }

    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          taskTags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              subTasks: true,
              dependencies: true,
            },
          },
          milestoneTasks: {
            include: {
              milestone: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: await this.enrichTasksWithAgents(tasks),
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async findAllBugs(query: TaskQueryDto, userId: string) {
    return this.findAllTasksByType(query, userId, 'bug');
  }
  async findAllTasks(
    query: TaskQueryDto & { type?: 'task' | 'bug' | 'all' },
    userId: string,
  ) {
    return this.findAllTasksByType(query, userId, query.type ?? 'all');
  }

  private async findAllTasksByType(
    query: TaskQueryDto,
    userId: string,
    type: 'task' | 'bug' | 'all',
  ) {
    const { filters, q, page, pageSize } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;
    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;

    // Get all projects user has access to
    const userProjects = await this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    const projectIds = userProjects.map((p) => p.id);

    // 可见范围 (visibility OR):
    //   - 用户是成员的项目中的任务
    //   - 未绑定项目 (projectId = null) 中用户为 reporter/assignee 的任务
    const visibilityOr: any[] = [
      ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
      { projectId: null, reporterId: userId },
      { projectId: null, assigneeId: userId },
    ];

    const where: any = {};

    if (type !== 'all') {
      where.type = type;
    }

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }

    // 子任务过滤：通过 parentTaskId 查询子任务
    if (query.parentTaskId) {
      where.parentTaskId = query.parentTaskId;
    }

    if (q) {
      // 搜索关键字时合并可见性到同一个 OR 下, 让 prisma 自动处理并列条件
      where.OR = [
        ...visibilityOr,
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    } else {
      where.OR = visibilityOr;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          taskTags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              subTasks: true,
              dependencies: true,
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    // 手动加载里程碑信息
    const milestoneIds = tasks
      .filter((t) => t.milestoneId)
      .map((t) => t.milestoneId!);
    const milestones =
      milestoneIds.length > 0
        ? await this.prisma.milestone.findMany({
            where: { id: { in: milestoneIds } },
            select: { id: true, name: true, status: true },
          })
        : [];
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

    const tasksWithMilestones = tasks.map((task) => ({
      ...task,
      milestone: task.milestoneId
        ? milestoneMap.get(task.milestoneId) || null
        : null,
    }));

    return {
      data: tasksWithMilestones,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  /**
   * 跨项目列出当前用户有权限访问的所有 task + bug (含 type/bug)
   * 优先按 projectId 过滤, 没传时返回所有用户能看到的 task
   * 用于文档/段落关联面板: 即使文档没绑定 project 也能拿到可选任务清单
   */
  async findAccessibleTasks(
    query: TaskQueryDto & { projectId?: string; type?: 'task' | 'bug' | 'all' },
    userId: string,
  ) {
    const { filters, q, page, pageSize, projectId, type = 'all' } = query;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;
    const parsedFilters = parseFilterQuery(filters, TASK_FILTER_KEYS);
    const statuses = parsedFilters.status;
    const assigneeIds = parsedFilters.assigneeId;

    // 用户有权限的 projects
    const userProjects = await this.prisma.project.findMany({
      where: {
        members: { some: { userId } },
      },
      select: { id: true },
    });
    const accessibleProjectIds = userProjects.map((p) => p.id);

    if (accessibleProjectIds.length === 0) {
      return {
        data: [],
        meta: { page: 1, pageSize: pageSizeNum, total: 0, totalPages: 0 },
      };
    }

    const projectFilter = projectId
      ? { equals: projectId, in: undefined }
      : { in: accessibleProjectIds };

    // type 过滤
    let typeFilter: any = undefined;
    if (type === 'task') {
      typeFilter = { equals: 'task' };
    } else if (type === 'bug') {
      typeFilter = { equals: 'bug' };
    } else {
      // all: 不限制 type (task + bug + 其它)
      typeFilter = undefined;
    }

    const where: any = {
      projectId: projectFilter,
    };
    if (typeFilter) {
      where.type = typeFilter;
    }
    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }
    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }
    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          project: { select: { id: true, name: true } },
          taskTags: { include: { tag: true } },
          _count: { select: { subTasks: true, dependencies: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    // 手动加载里程碑信息
    const milestoneIds = tasks
      .filter((t) => t.milestoneId)
      .map((t) => t.milestoneId!);
    const milestones =
      milestoneIds.length > 0
        ? await this.prisma.milestone.findMany({
            where: { id: { in: milestoneIds } },
            select: { id: true, name: true, status: true },
          })
        : [];
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

    const tasksWithMilestones = tasks.map((task) => ({
      ...task,
      milestone: task.milestoneId
        ? milestoneMap.get(task.milestoneId) || null
        : null,
    }));

    return {
      data: tasksWithMilestones,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        OR: this.visibilityOr(userId),
      },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // 无项目时: 仅 reporter / assignee 可修改
    if (!task.projectId) {
      const isOwner = task.reporterId === userId || task.assigneeId === userId;
      if (!isOwner) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else if (task.project?.members.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const oldStatus = task.status;
    const updateData: any = { ...updateTaskDto };

    if (
      updateTaskDto.assigneeType === 'ai_agent' &&
      !(updateTaskDto.aiAgentId || task.aiAgentId)
    ) {
      throw new BadRequestException(
        'aiAgentId is required when assigneeType is ai_agent',
      );
    }

    if (updateTaskDto.startDate !== undefined) {
      updateData.startDate = updateTaskDto.startDate
        ? new Date(updateTaskDto.startDate)
        : null;
    }

    if (updateTaskDto.dueDate !== undefined) {
      updateData.dueDate = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : null;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    // AI Agent Assignment
    if (updateTaskDto.aiAgentId !== undefined && updateTaskDto.aiAgentId) {
      await this.ensureAssignableAgent(task.projectId, updateTaskDto.aiAgentId);
      updateData.assigneeType = 'ai_agent';
      updateData.aiExecutionStatus =
        updateTaskDto.aiExecutionStatus || task.aiExecutionStatus || 'pending';
    }

    if (
      updateTaskDto.assigneeType === 'user' &&
      updateTaskDto.aiAgentId === undefined
    ) {
      updateData.aiAgentId = null;
    }

    // When the task is linked to an external provider (e.g. Linear),
    // mark it as having local changes so the next sync can push them upstream.
    const hasMeaningfulLocalChange =
      task.externalProvider &&
      task.externalIssueId &&
      (updateData.title !== undefined ||
        updateData.description !== undefined ||
        updateData.status !== undefined ||
        updateData.priority !== undefined ||
        updateData.dueDate !== undefined ||
        updateData.startDate !== undefined ||
        updateData.assigneeId !== undefined ||
        updateData.estimate !== undefined);
    if (hasMeaningfulLocalChange && updateData.syncStatus === undefined) {
      updateData.syncStatus = 'pending';
    }
    if (hasMeaningfulLocalChange) {
      updateData.localUpdatedAt = new Date();
    }

    // V3 验收门禁：任务标 done 前，所有验收契约必须处于 passed/waived。
    // 无契约的任务不拦（存量兼容）；未决或被驳回的契约会阻断完成。
    if (updateData.status === 'done' && oldStatus !== 'done') {
      const blocking = await this.prisma.acceptance.findMany({
        where: {
          taskId: id,
          status: { notIn: ['passed', 'waived'] },
        },
        select: { id: true, title: true, status: true },
      });
      if (blocking.length > 0) {
        throw new UnprocessableEntityException({
          code: 'TASK_DONE_BLOCKED',
          message: `存在 ${blocking.length} 个未通过验收的契约，需先接收（passed）或豁免（waived）`,
          acceptances: blocking,
        });
      }
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        taskTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Update tags if provided
    if (updateTaskDto.tags !== undefined) {
      // Remove existing tags
      await this.prisma.taskTag.deleteMany({
        where: { taskId: id },
      });

      // Add new tags
      if (updateTaskDto.tags.length > 0) {
        await Promise.all(
          updateTaskDto.tags.map((tagId) =>
            this.prisma.taskTag.create({
              data: {
                taskId: id,
                tagId,
                projectId: task.projectId,
              },
            }),
          ),
        );
      }
    }

    // 全字段 diff 落动态：任何被实际修改的字段都会进入操作记录
    const normalize = (value: unknown): string | null => {
      if (value === undefined || value === null || value === '') return null;
      if (value instanceof Date) return value.toISOString();
      return String(value);
    };
    const DIFF_FIELDS = [
      'title',
      'description',
      'priority',
      'status',
      'assigneeId',
      'projectId',
      'milestoneId',
      'iterationId',
      'startDate',
      'dueDate',
      'estimate',
      'severity',
    ] as const;
    const changes: ActivityChange[] = DIFF_FIELDS.flatMap((field) => {
      if (updateData[field] === undefined) return [];
      const oldValue = normalize((task as Record<string, unknown>)[field]);
      const newValue = normalize(updateData[field]);
      return oldValue === newValue ? [] : [{ field, oldValue, newValue }];
    });

    if (changes.length > 0) {
      const statusChange = changes.find((c) => c.field === 'status');
      const assigneeChange = changes.find((c) => c.field === 'assigneeId');
      await this.recordTaskActivity(task, {
        actorId: userId,
        type: statusChange
          ? 'status_changed'
          : assigneeChange
            ? 'assigned'
            : 'field_changed',
        summary: statusChange
          ? `Status changed from ${statusChange.oldValue ?? 'empty'} to ${statusChange.newValue ?? 'empty'}`
          : assigneeChange
            ? 'Changed assignee'
            : `Updated ${changes.map((c) => c.field).join(', ')}`,
        source: 'user',
        changes,
      });
    }

    // 标签变化单独记录
    if (updateTaskDto.tags !== undefined) {
      const oldTagIds = (
        await this.prisma.taskTag.findMany({
          where: { taskId: id },
          select: { tagId: true },
        })
      ).map((tt) => tt.tagId);
      const added = updateTaskDto.tags.filter(
        (tagId) => !oldTagIds.includes(tagId),
      );
      const removed = oldTagIds.filter(
        (tagId) => !updateTaskDto.tags!.includes(tagId),
      );
      if (added.length > 0 || removed.length > 0) {
        await this.recordTaskActivity(task, {
          actorId: userId,
          type: 'field_changed',
          summary: 'Changed labels',
          source: 'user',
          changes: [
            ...added.map((tagId) => ({ field: 'labels', newValue: tagId })),
            ...removed.map((tagId) => ({ field: 'labels', oldValue: tagId })),
          ],
        });
      }
    }

    // Publish event
    this.messageBus.publish('task.updated', {
      taskId: id,
      projectId: task.projectId,
      userId,
      task: updatedTask,
    });

    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        OR: this.visibilityOr(userId),
      },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId,
                role: { in: ['owner', 'maintainer'] },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // 无项目时: 仅 reporter 可删除
    if (!task.projectId) {
      if (task.reporterId !== userId) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else if (task.project?.members.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.task.delete({
      where: { id },
    });
  }

  async assignAgent(taskId: string, dto: AssignTaskAgentDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    await this.ensureProjectMember(task.projectId, userId);
    const agent = await this.ensureAssignableAgent(task.projectId, dto.agentId);

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeType: 'ai_agent',
        aiAgentId: dto.agentId,
        aiExecutionSpec: this.toJsonValue(
          dto.aiExecutionSpec ??
            task.aiExecutionSpec ?? {
              tools: ['task.read', 'task.write'],
              confirmationRequired: true,
            },
        ),
        aiExecutionStatus: 'pending',
      },
    });

    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'assigned',
      summary: `Assigned AI agent "${agent.name}"`,
      source: 'user',
      changes: [
        { field: 'aiAgentId', oldValue: task.aiAgentId, newValue: dto.agentId },
      ],
      metadata: { assigneeType: 'ai_agent' },
    });

    this.messageBus.publish('task.agent.assigned', {
      projectId: task.projectId,
      taskId,
      agentId: dto.agentId,
      userId,
    });

    return this.findOne(taskId, userId);
  }

  async getExecutions(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    await this.ensureProjectMember(task.projectId, userId);

    return this.prisma.executionRun.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: {
          orderBy: { requestedAt: 'desc' },
        },
      },
    });
  }

  async createExecution(
    taskId: string,
    dto: CreateTaskExecutionDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        projectId: true,
        title: true,
        aiAgentId: true,
        aiExecutionSpec: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    await this.ensureProjectMember(task.projectId, userId);

    if (!task.aiAgentId) {
      throw new BadRequestException(
        'Task must have an assigned AI agent before creating an execution',
      );
    }

    const agent = await this.ensureAssignableAgent(
      task.projectId,
      task.aiAgentId,
    );
    const contextPack =
      dto.contextPack ?? (await this.buildTaskExecutionContext(taskId));
    const requiresApproval = dto.requiresApproval ?? true;
    const actionType = dto.actionType || 'task.write';

    const execution = await this.prisma.executionRun.create({
      data: {
        projectId: task.projectId!,
        taskId,
        subjectType: 'platform_ai_member',
        subjectId: task.aiAgentId!,
        identitySource: 'internal',
        role: agent.type,
        goal: dto.goal || `执行任务「${task.title}」的 AI 计划`,
        status: requiresApproval ? 'pending_approval' : 'in_progress',
        input: this.toJsonValue(dto.input ?? {}),
        output: this.toJsonValue({
          plan: dto.plan ?? {
            expectedOutput:
              (task.aiExecutionSpec as Record<string, unknown> | null)
                ?.expectedOutput ?? '输出结构化任务执行计划与回写建议',
            tools: (task.aiExecutionSpec as Record<string, unknown> | null)
              ?.tools ?? ['task.read', 'task.write'],
          },
          contextPack,
          requiresApproval,
          requestedBy: userId,
          actorType: agent.type,
        }),
        metadata: this.toJsonValue({
          source: 'task.execution',
        }),
      },
      include: {
        approvals: true,
      },
    });

    let approvalRequest = null;

    if (requiresApproval) {
      approvalRequest = await this.prisma.approvalRequest.create({
        data: {
          executionRunId: execution.id,
          projectId: task.projectId!,
          taskId,
          actionType,
          riskLevel: 'write',
          requestedAction: `执行任务「${task.title}」的 AI 操作`,
          reason:
            dto.approvalReason || 'AI 任务执行包含写操作，等待人工确认后继续',
          metadata: this.toJsonValue({
            requestedBy: userId,
            goal: dto.goal,
            input: dto.input,
            plan: dto.plan,
          }),
        },
      });
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        aiExecutionStatus: 'pending',
        aiExecutionResult: Prisma.JsonNull,
      },
    });

    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'ai_execution',
      summary: `Created AI execution run for "${agent.name}"`,
      source: 'ai',
      metadata: {
        executionRunId: execution.id,
        requiresApproval,
        actionType,
      },
    });

    this.messageBus.publish('task.execution.created', {
      projectId: task.projectId,
      taskId,
      executionRunId: execution.id,
      approvalRequestId: approvalRequest?.id,
      userId,
    });

    return {
      execution: await this.prisma.executionRun.findUnique({
        where: { id: execution.id },
        include: {
          approvals: true,
        },
      }),
      approvalRequest,
      contextPack,
    };
  }

  async confirmExecution(
    taskId: string,
    executionId: string,
    dto: ConfirmTaskExecutionDto,
    userId: string,
  ) {
    const execution = await this.prisma.executionRun.findUnique({
      where: { id: executionId },
      include: {
        approvals: {
          where: { status: 'pending' },
          orderBy: { requestedAt: 'desc' },
        },
      },
    });

    if (!execution || execution.taskId !== taskId) {
      throw new NotFoundException(
        `Execution ${executionId} not found for task ${taskId}`,
      );
    }

    if (!execution.projectId) {
      throw new BadRequestException('Execution is missing project scope');
    }

    await this.ensureProjectApprover(execution.projectId, userId);

    const pendingApproval = execution.approvals[0];
    if (!pendingApproval) {
      throw new BadRequestException(
        'Execution has no pending approval request',
      );
    }

    const approvalStatus =
      dto.decision === 'approved' ? 'approved' : 'rejected';
    const executionStatus =
      dto.decision === 'approved' ? 'approved' : 'rejected';

    const [approvalRequest] = await this.prisma.$transaction([
      this.prisma.approvalRequest.update({
        where: { id: pendingApproval.id },
        data: {
          status: approvalStatus,
          approvedBy: dto.decision === 'approved' ? userId : null,
          rejectedBy: dto.decision === 'rejected' ? userId : null,
          resolvedAt: new Date(),
          resolutionNote: dto.comment ?? null,
        },
      }),
      this.prisma.executionRun.update({
        where: { id: executionId },
        data: {
          status: executionStatus,
          output:
            dto.decision === 'approved'
              ? this.toJsonValue({
                  approval: 'granted',
                  comment: dto.comment || null,
                })
              : undefined,
          errorDetail:
            dto.decision === 'rejected'
              ? { message: dto.comment || 'Execution rejected by reviewer' }
              : Prisma.JsonNull,
        },
      }),
      this.prisma.task.update({
        where: { id: taskId },
        data: {
          aiExecutionStatus: dto.decision === 'approved' ? 'pending' : 'failed',
          aiExecutionResult:
            dto.decision === 'approved'
              ? {
                  executionRunId: executionId,
                  approvalStatus: 'approved',
                }
              : {
                  executionRunId: executionId,
                  approvalStatus: 'rejected',
                  comment: dto.comment || null,
                },
        },
      }),
    ]);

    await this.recordTaskActivity(
      { id: taskId, projectId: execution.projectId },
      {
        actorId: userId,
        type: 'ai_execution',
        summary:
          dto.decision === 'approved'
            ? 'Approved AI execution request'
            : 'Rejected AI execution request',
        source: 'user',
        metadata: {
          executionRunId: executionId,
          approvalRequestId: pendingApproval.id,
          decision: dto.decision,
          comment: dto.comment || null,
        },
      },
    );

    this.messageBus.publish('task.execution.confirmed', {
      projectId: execution.projectId,
      taskId,
      executionRunId: executionId,
      approvalRequestId: pendingApproval.id,
      decision: dto.decision,
      userId,
    });

    return {
      execution: await this.prisma.executionRun.findUnique({
        where: { id: executionId },
        include: {
          approvals: true,
        },
      }),
      approvalRequest,
    };
  }

  async addDependency(
    taskId: string,
    dto: CreateTaskDependencyDto,
    userId: string,
  ) {
    if (dto.dependsOnTaskId === taskId) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    // Ensure user has access to the base task
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Ensure dependency task exists in same project
    const dependsOnTask = await this.prisma.task.findFirst({
      where: {
        id: dto.dependsOnTaskId,
        projectId: task.projectId,
      },
    });

    if (!dependsOnTask) {
      throw new NotFoundException(
        `Dependency task ${dto.dependsOnTaskId} not found in project`,
      );
    }

    // Avoid duplicate dependencies
    const existing = await this.prisma.taskDependency.findFirst({
      where: {
        taskId,
        dependsOnTaskId: dto.dependsOnTaskId,
      },
    });

    if (existing) {
      return existing;
    }

    const type: 'blocks' | 'relates' = dto.type || 'blocks';

    const dependency = await this.prisma.taskDependency.create({
      data: {
        projectId: task.projectId,
        taskId,
        dependsOnTaskId: dto.dependsOnTaskId,
        type,
      },
    });

    // Activity record
    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'field_changed',
      summary: `Added dependency on "${dependsOnTask.title}"`,
      source: 'user',
      changes: [{ field: 'dependencies', newValue: dependsOnTask.id }],
      metadata: {
        action: 'add',
        dependencyId: dependency.id,
        dependsOnTaskId: dependsOnTask.id,
        dependsOnTaskTitle: dependsOnTask.title,
      },
    });

    // Event
    this.messageBus.publish('task.dependency.created', {
      projectId: task.projectId,
      taskId,
      dependsOnTaskId: dependsOnTask.id,
      type,
      userId,
    });

    return dependency;
  }

  async removeDependency(taskId: string, dependencyId: string, userId: string) {
    const dependency = await this.prisma.taskDependency.findUnique({
      where: { id: dependencyId },
      include: {
        task: true,
        dependsOnTask: true,
      },
    });

    if (!dependency || dependency.taskId !== taskId) {
      throw new NotFoundException(
        `Dependency ${dependencyId} not found for task ${taskId}`,
      );
    }

    // Ensure user has access to the project
    if (dependency.projectId) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: dependency.projectId,
            userId,
          },
        },
      });

      if (!member) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else {
      // 无项目关联的依赖, 仅允许 reporter 操作
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { reporterId: true },
      });
      if (!task || task.reporterId !== userId) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    await this.prisma.taskDependency.delete({
      where: { id: dependencyId },
    });

    await this.recordTaskActivity(
      { id: taskId, projectId: dependency.projectId },
      {
        actorId: userId,
        type: 'field_changed',
        summary: `Removed dependency on "${dependency.dependsOnTask.title}"`,
        source: 'user',
        changes: [
          { field: 'dependencies', oldValue: dependency.dependsOnTaskId },
        ],
        metadata: {
          action: 'remove',
          dependencyId,
          dependsOnTaskId: dependency.dependsOnTaskId,
          dependsOnTaskTitle: dependency.dependsOnTask.title,
        },
      },
    );

    this.messageBus.publish('task.dependency.deleted', {
      projectId: dependency.projectId,
      taskId,
      dependsOnTaskId: dependency.dependsOnTaskId,
      type: dependency.type,
      userId,
    });
  }

  async getActivities(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return this.prisma.taskActivity.findMany({
      where: { taskId },
      orderBy: { timestamp: 'desc' },
      include: {
        // Note: actorId references User, but we don't have a relation defined
        // For now, we'll just return the actorId
      },
    });
  }

  async importTasks(tasks: any[], userId: string) {
    if (!tasks || tasks.length === 0) {
      throw new BadRequestException('No tasks to import');
    }

    // Use the first task's projectId (all tasks should be in the same project)
    const projectId = tasks[0].projectId;
    if (!projectId) {
      throw new BadRequestException('projectId is required for import');
    }

    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Get default status
    let defaultStatus = await this.prisma.statusDefinition.findFirst({
      where: { type: 'task', projectId },
      orderBy: { order: 'asc' },
    });

    if (!defaultStatus) {
      defaultStatus = await this.prisma.statusDefinition.findFirst({
        where: { type: 'task', projectId: null },
        orderBy: { order: 'asc' },
      });
    }

    const status = defaultStatus?.key || 'todo';

    // Create tasks
    const createdTasks = await Promise.all(
      tasks.map((task) =>
        this.prisma.task.create({
          data: {
            projectId,
            title: task.title,
            description: task.description,
            status: task.status || status,
            priority: task.priority || 'medium',
            assigneeId: task.assigneeId,
            reporterId: task.reporterId || userId,
            iterationId: task.iterationId,
            startDate: task.startDate ? new Date(task.startDate) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            estimate: task.estimate,
          },
        }),
      ),
    );

    return {
      imported: createdTasks.length,
      tasks: createdTasks,
    };
  }

  async exportTasks(projectId: string, userId: string, format: string) {
    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, username: true, displayName: true },
        },
        reporter: {
          select: { id: true, username: true, displayName: true },
        },
        taskTags: {
          include: { tag: true },
        },
      },
    });

    if (format === 'json') {
      return tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.displayName || task.assignee?.username,
        reporterId: task.reporterId,
        reporterName: task.reporter?.displayName || task.reporter?.username,
        iterationId: task.iterationId,
        startDate: task.startDate,
        dueDate: task.dueDate,
        estimate: task.estimate,
        tags: task.taskTags.map((tt) => tt.tag.name),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));
    }

    return tasks;
  }

  // ─── AI Worker Methods ──────────────────────────────────────────
  // ============================================
  // V1 AI 方法 (deprecated) - 使用 Execution 模块替代
  // 将在 v3.0 中移除
  // ============================================

  /**
   * @deprecated AI agent claims a task — 请使用 Execution 模块的 ExecutionRun API
   * 将在 v3.0 中移除
   */
  async claimForAi(taskId: string, dto: ClaimTaskDto, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: this.visibilityOr(userId),
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (
      task.assigneeType === 'ai_agent' &&
      task.aiExecutionStatus === 'running'
    ) {
      throw new BadRequestException(
        'Task is already claimed by an AI agent and running',
      );
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeType: 'ai_agent',
        aiAgentId: dto.aiAgentId,
        aiExecutionStatus: 'pending',
        aiExecutionSpec: dto.aiExecutionSpec
          ? (dto.aiExecutionSpec as Prisma.InputJsonValue)
          : undefined,
      },
    });

    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'assigned',
      summary: `Task claimed by AI agent ${dto.aiAgentId}`,
      source: 'ai',
      changes: [{ field: 'assigneeType', newValue: 'ai_agent' }],
      metadata: { action: 'ai_claim', aiAgentId: dto.aiAgentId },
    });

    this.messageBus.publish('task.ai.claimed', {
      taskId,
      projectId: task.projectId,
      aiAgentId: dto.aiAgentId,
      userId,
    });

    return updated;
  }

  /**
   * @deprecated AI agent submits a suggestion — 请使用 Execution 模块的 ExecutionRun API
   * 将在 v3.0 中移除
   */
  async submitAiSuggestion(
    taskId: string,
    dto: AiSuggestionDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: this.visibilityOr(userId),
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        aiSuggestion: dto.aiSuggestion as Prisma.InputJsonValue,
        ...(dto.aiExecutionSpec
          ? { aiExecutionSpec: dto.aiExecutionSpec as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'ai_execution',
      summary: 'AI suggestion submitted',
      source: 'ai',
      metadata: { action: 'ai_suggestion' },
    });

    this.messageBus.publish('task.ai.suggestion', {
      taskId,
      projectId: task.projectId,
      userId,
    });

    return updated;
  }

  /**
   * @deprecated AI agent submits execution result — 请使用 Execution 模块的 ExecutionRun API
   * 将在 v3.0 中移除
   */
  async submitAiExecutionResult(
    taskId: string,
    dto: AiExecutionResultDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: this.visibilityOr(userId),
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (task.assigneeType !== 'ai_agent') {
      throw new BadRequestException('Task is not assigned to an AI agent');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        aiExecutionResult: dto.aiExecutionResult as Prisma.InputJsonValue,
        aiExecutionStatus: dto.aiExecutionStatus,
      },
    });

    // If AI completed successfully, move task status to "done" if not already
    if (dto.aiExecutionStatus === 'completed' && task.status !== 'done') {
      await this.prisma.task.update({
        where: { id: taskId },
        data: { status: 'done' },
      });
    }

    await this.recordTaskActivity(task, {
      actorId: userId,
      type: 'ai_execution',
      summary: `AI execution ${dto.aiExecutionStatus}`,
      source: 'ai',
      metadata: {
        action: 'ai_result',
        status: dto.aiExecutionStatus,
        error: dto.error,
      },
    });

    this.messageBus.publish('task.ai.result', {
      taskId,
      projectId: task.projectId,
      status: dto.aiExecutionStatus,
      userId,
    });

    return updated;
  }

  /**
   * @deprecated Find tasks that can be discovered by AI — 请使用 Execution 模块的 API
   * 将在 v3.0 中移除
   */
  async findAiDiscoverableTasks(query: AiDiscoverQueryDto, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: query.projectId,
        members: { some: { userId } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${query.projectId} not found`);
    }

    const where: any = {
      projectId: query.projectId,
      assigneeType: 'user',
      aiExecutionStatus: null,
      status: { notIn: ['done', 'closed', 'cancelled'] },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 50,
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        taskTags: {
          include: { tag: true },
        },
        _count: {
          select: {
            subTasks: true,
            dependencies: true,
          },
        },
      },
    });

    return tasks;
  }

  convertToCSV(tasks: any[]): string {
    const headers = [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'assigneeId',
      'assigneeName',
      'reporterId',
      'reporterName',
      'iterationId',
      'startDate',
      'dueDate',
      'estimate',
      'tags',
      'createdAt',
      'updatedAt',
    ];

    const rows = tasks.map((task) => [
      task.id,
      `"${(task.title || '').replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      task.status,
      task.priority,
      task.assigneeId || '',
      task.assignee?.displayName || task.assignee?.username || '',
      task.reporterId || '',
      task.reporter?.displayName || task.reporter?.username || '',
      task.iterationId || '',
      task.startDate
        ? new Date(task.startDate).toISOString().split('T')[0]
        : '',
      task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      task.estimate || '',
      (task.taskTags || []).map((tt: any) => tt.tag.name).join(', '),
      task.createdAt ? new Date(task.createdAt).toISOString() : '',
      task.updatedAt ? new Date(task.updatedAt).toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
