import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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
import { parseFilterQuery } from '../../common/utils/filter-query.util';

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
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    // Verify project exists and user has access
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

    // Verify parent task if provided
    if (createTaskDto.parentTaskId) {
      const parentTask = await this.prisma.task.findFirst({
        where: {
          id: createTaskDto.parentTaskId,
          projectId: createTaskDto.projectId,
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
          projectId: createTaskDto.projectId,
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
          OR: [{ projectId: createTaskDto.projectId }, { projectId: null }],
        },
      });

      if (!statusDef) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
    }

    // Create task
    const task = await this.prisma.task.create({
      data: {
        projectId: createTaskDto.projectId,
        title: createTaskDto.title,
        description: createTaskDto.description,
        status,
        priority: createTaskDto.priority || 'medium',
        assigneeId: createTaskDto.assigneeId,
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
              projectId: createTaskDto.projectId,
            },
          }),
        ),
      );
    }

    // Create activity record
    await this.prisma.taskActivity.create({
      data: {
        projectId: task.projectId,
        taskId: task.id,
        actorId: userId,
        type: 'status_changed',
        summary: `Task created`,
        source: 'user',
        detail: {
          status: task.status,
        },
      },
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

    return {
      data: tasks,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
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

    return {
      ...task,
      milestone,
    };
  }

  async findBugs(projectId: string, query: TaskQueryDto, userId: string) {
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
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
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

    return {
      data: tasks,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async findAllBugs(query: TaskQueryDto, userId: string) {
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

    const where: any = {
      type: 'bug',
      projectId: { in: projectIds },
    };

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = { in: assigneeIds };
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
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

    return {
      data: tasks,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
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

    if (task.project.members.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const oldStatus = task.status;
    const updateData: any = { ...updateTaskDto };

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

    // Create activity record for status change
    if (updateTaskDto.status && updateTaskDto.status !== oldStatus) {
      await this.prisma.taskActivity.create({
        data: {
          projectId: task.projectId,
          taskId: id,
          actorId: userId,
          type: 'status_changed',
          summary: `Status changed from ${oldStatus} to ${updateTaskDto.status}`,
          source: 'user',
          detail: {
            field: 'status',
            oldValue: oldStatus,
            newValue: updateTaskDto.status,
          },
        },
      });
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
    const task = await this.prisma.task.findUnique({
      where: { id },
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

    if (task.project.members.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { success: true };
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
    await this.prisma.taskActivity.create({
      data: {
        projectId: task.projectId,
        taskId,
        actorId: userId,
        type: 'field_changed',
        summary: `Added dependency on "${dependsOnTask.title}"`,
        source: 'user',
        detail: {
          field: 'dependencies',
          action: 'add',
          dependencyId: dependency.id,
          dependsOnTaskId: dependsOnTask.id,
          dependsOnTaskTitle: dependsOnTask.title,
        },
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

    await this.prisma.taskDependency.delete({
      where: { id: dependencyId },
    });

    await this.prisma.taskActivity.create({
      data: {
        projectId: dependency.projectId,
        taskId,
        actorId: userId,
        type: 'field_changed',
        summary: `Removed dependency on "${dependency.dependsOnTask.title}"`,
        source: 'user',
        detail: {
          field: 'dependencies',
          action: 'remove',
          dependencyId,
          dependsOnTaskId: dependency.dependsOnTaskId,
          dependsOnTaskTitle: dependency.dependsOnTask.title,
        },
      },
    });

    this.messageBus.publish('task.dependency.deleted', {
      projectId: dependency.projectId,
      taskId,
      dependsOnTaskId: dependency.dependsOnTaskId,
      type: dependency.type,
      userId,
    });

    return { success: true };
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

  /**
   * AI agent claims a task — sets assigneeType + aiAgentId + execution status
   */
  async claimForAi(taskId: string, dto: ClaimTaskDto, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: { members: { some: { userId } } },
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

    await this.prisma.taskActivity.create({
      data: {
        projectId: task.projectId,
        taskId,
        actorId: userId,
        type: 'field_changed',
        summary: `Task claimed by AI agent ${dto.aiAgentId}`,
        source: 'ai_agent',
        detail: {
          field: 'assigneeType',
          action: 'ai_claim',
          aiAgentId: dto.aiAgentId,
        },
      },
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
   * AI agent submits a suggestion for a task
   */
  async submitAiSuggestion(
    taskId: string,
    dto: AiSuggestionDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: { members: { some: { userId } } },
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

    await this.prisma.taskActivity.create({
      data: {
        projectId: task.projectId,
        taskId,
        actorId: userId,
        type: 'field_changed',
        summary: 'AI suggestion submitted',
        source: 'ai_agent',
        detail: {
          field: 'aiSuggestion',
          action: 'ai_suggestion',
        },
      },
    });

    this.messageBus.publish('task.ai.suggestion', {
      taskId,
      projectId: task.projectId,
      userId,
    });

    return updated;
  }

  /**
   * AI agent submits execution result (completed or failed)
   */
  async submitAiExecutionResult(
    taskId: string,
    dto: AiExecutionResultDto,
    userId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: { members: { some: { userId } } },
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

    await this.prisma.taskActivity.create({
      data: {
        projectId: task.projectId,
        taskId,
        actorId: userId,
        type: 'field_changed',
        summary: `AI execution ${dto.aiExecutionStatus}`,
        source: 'ai_agent',
        detail: {
          field: 'aiExecutionStatus',
          action: 'ai_result',
          status: dto.aiExecutionStatus,
          error: dto.error,
        },
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
   * Find tasks that can be discovered / claimed by AI agents
   * Returns tasks that are not yet assigned to an AI agent and are in an actionable state
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
