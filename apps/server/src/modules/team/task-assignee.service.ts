import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  CreateTaskAssigneeDto,
  BulkSetTaskAssigneesDto,
  AddTaskWatcherDto,
} from './dto/task-assignee.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TaskAssigneeService {
  private readonly logger = new Logger(TaskAssigneeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async add(dto: CreateTaskAssigneeDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
    });
    if (!task) throw new NotFoundException('Task not found');
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    // 检查是否已存在
    const existing = await this.prisma.taskAssignee.findFirst({
      where: {
        taskId: dto.taskId,
        memberId: dto.memberId,
      },
    });
    
    const result = existing
      ? existing
      : await this.prisma.taskAssignee.create({
          data: {
            taskId: dto.taskId,
            memberId: dto.memberId,
          },
        });

    // 同步主负责人
    const assigneeType = member.type === 'ai_agent' ? 'ai_agent' : 'user';
    await this.prisma.task.update({
      where: { id: dto.taskId },
      data: {
        assigneeId: member.userId ?? null,
        assigneeType,
        aiAgentId: member.type === 'ai_agent' ? member.id : null,
      },
    });

    // 触发活动
    await this.prisma.taskActivity.create({
      data: {
        projectId: task.projectId,
        taskId: dto.taskId,
        actorId: userId,
        type: 'field_changed',
        summary: `指派给 ${member.displayName}`,
        source: 'user',
      },
    });

    // 触发通知
    if (member.userId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: member.userId,
            type: 'task.assigned',
            title: `新任务指派: ${task.title}`,
            body: `你被指派了一个新任务`,
            projectId: task.projectId,
            taskId: task.id,
            channels: ['in-app'],
            status: 'unread',
          },
        });
      } catch (e) {
        this.logger.warn('Notification create failed', e);
      }
    }

    return result;
  }

  async bulkSet(dto: BulkSetTaskAssigneesDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
    });
    if (!task) throw new NotFoundException('Task not found');

    // 清理当前
    await this.prisma.taskAssignee.deleteMany({
      where: { taskId: dto.taskId },
    });

    const records = await Promise.all(
      dto.assignees.map((a) =>
        this.prisma.taskAssignee.create({
          data: {
            taskId: dto.taskId,
            memberId: a.memberId,
          },
        }),
      ),
    );

    // 同步主负责人
    if (dto.assignees.length > 0) {
      const member = await this.prisma.member.findUnique({
        where: { id: dto.assignees[0].memberId },
      });
      if (member) {
        const assigneeType = member.type === 'ai_agent' ? 'ai_agent' : 'user';
        await this.prisma.task.update({
          where: { id: dto.taskId },
          data: {
            assigneeId: member.userId ?? null,
            assigneeType,
            aiAgentId: member.type === 'ai_agent' ? member.id : null,
          },
        });
      }
    }

    return records;
  }

  async remove(taskId: string, memberId: string) {
    const existing = await this.prisma.taskAssignee.findFirst({
      where: { taskId, memberId },
    });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.prisma.taskAssignee.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async list(taskId: string) {
    const assignees = await this.prisma.taskAssignee.findMany({
      where: { taskId },
      orderBy: { assignedAt: 'asc' },
    });

    // 手动获取Member信息
    const memberIds = [...new Set(assignees.map(a => a.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        type: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        status: true,
      },
    });
    const memberMap = new Map(members.map(m => [m.id, m]));

    return assignees.map(assignee => ({
      ...assignee,
      member: memberMap.get(assignee.memberId),
    }));
  }

  async listByMember(memberId: string) {
    const assignees = await this.prisma.taskAssignee.findMany({
      where: { memberId },
      orderBy: { assignedAt: 'desc' },
    });

    // 手动获取Task信息
    const taskIds = [...new Set(assignees.map(a => a.taskId))];
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
      },
    });
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    return assignees.map(assignee => ({
      ...assignee,
      task: taskMap.get(assignee.taskId),
    }));
  }

  async addWatcher(dto: AddTaskWatcherDto) {
    const existing = await this.prisma.taskWatcher.findFirst({
      where: {
        taskId: dto.taskId,
        memberId: dto.memberId,
      },
    });
    if (existing) return existing;
    return this.prisma.taskWatcher.create({
      data: { taskId: dto.taskId, memberId: dto.memberId },
    });
  }

  async removeWatcher(taskId: string, memberId: string) {
    const existing = await this.prisma.taskWatcher.findFirst({
      where: { taskId, memberId },
    });
    if (!existing) throw new NotFoundException('Watcher not found');
    await this.prisma.taskWatcher.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async listWatchers(taskId: string) {
    const watchers = await this.prisma.taskWatcher.findMany({
      where: { taskId },
    });

    // 手动获取Member信息
    const memberIds = [...new Set(watchers.map(w => w.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        type: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
      },
    });
    const memberMap = new Map(members.map(m => [m.id, m]));

    return watchers.map(watcher => ({
      ...watcher,
      member: memberMap.get(watcher.memberId),
    }));
  }

  /**
   * 获取成员在某项目下的负载统计
   */
  async getMemberLoad(memberId: string, projectId?: string) {
    const where: any = { memberId };
    if (projectId) {
      where.task = { projectId };
    }
    const [todo, inProgress, completed] = await Promise.all([
      this.prisma.taskAssignee.count({
        where: {
          ...where,
          task: {
            ...(projectId ? { projectId } : {}),
            status: { in: ['todo', 'backlog'] },
          },
        },
      }),
      this.prisma.taskAssignee.count({
        where: {
          ...where,
          task: {
            ...(projectId ? { projectId } : {}),
            status: { in: ['in_progress', 'pending_approval'] },
          },
        },
      }),
      this.prisma.taskAssignee.count({
        where: {
          ...where,
          task: {
            ...(projectId ? { projectId } : {}),
            status: { in: ['done', 'completed'] },
          },
        },
      }),
    ]);
    return {
      todo,
      inProgress,
      completed,
      total: todo + inProgress + completed,
    };
  }
}
