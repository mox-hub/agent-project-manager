import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';

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
    let status = createTaskDto.status;
    if (!status) {
      const defaultStatus = await this.prisma.statusDefinition.findFirst({
        where: {
          type: 'task',
          projectId: null,
          order: 0,
        },
      });
      status = defaultStatus?.key || 'todo';
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
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
        estimate: createTaskDto.estimate,
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

    const {
      status,
      assigneeId,
      iterationId,
      parentTaskId,
      tag,
      q,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {
      projectId,
    };

    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (iterationId) {
      where.iterationId = iterationId;
    }

    if (parentTaskId !== undefined) {
      where.parentTaskId = parentTaskId;
    }

    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    if (tag) {
      const tagIds = Array.isArray(tag) ? tag : [tag];
      where.taskTags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
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

    return task;
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

    if (updateTaskDto.dueDate) {
      updateData.dueDate = new Date(updateTaskDto.dueDate);
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
}
