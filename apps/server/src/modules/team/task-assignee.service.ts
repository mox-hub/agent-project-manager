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

    const role = dto.role ?? 'assignee';
    const existing = await this.prisma.taskAssignee.findUnique({
      where: {
        uniq_task_assignee_role: {
          taskId: dto.taskId,
          memberId: dto.memberId,
          role,
        },
      },
    });
    const result = existing
      ? existing
      : await this.prisma.taskAssignee.create({
          data: {
            taskId: dto.taskId,
            memberId: dto.memberId,
            role,
            assignedBy: userId,
          },
        });

    // 同步主负责人
    if (role === 'assignee') {
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

    // 触发活动
    await this.prisma.taskActivity.create({
      data: {
        projectId: task.projectId,
        taskId: dto.taskId,
        actorId: userId,
        type: 'field_changed',
        summary: `指派给 ${member.displayName} (${role})`,
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
            role: a.role ?? 'assignee',
            assignedBy: userId,
          },
        }),
      ),
    );

    // 同步主负责人
    const mainAssignee = dto.assignees.find(
      (a) => (a.role ?? 'assignee') === 'assignee',
    );
    if (mainAssignee) {
      const member = await this.prisma.member.findUnique({
        where: { id: mainAssignee.memberId },
      });
      if (member) {
        await this.prisma.task.update({
          where: { id: dto.taskId },
          data: {
            assigneeId: member.userId ?? null,
            assigneeType: member.type === 'ai_agent' ? 'ai_agent' : 'user',
            aiAgentId: member.type === 'ai_agent' ? member.id : null,
          },
        });
      }
    }

    return records;
  }

  async remove(taskId: string, memberId: string, role: string) {
    const existing = await this.prisma.taskAssignee.findUnique({
      where: {
        uniq_task_assignee_role: { taskId, memberId, role },
      },
    });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.prisma.taskAssignee.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async list(taskId: string) {
    return this.prisma.taskAssignee.findMany({
      where: { taskId },
      include: {
        member: {
          select: {
            id: true,
            type: true,
            displayName: true,
            handle: true,
            avatarUrl: true,
            status: true,
            isOnline: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { assignedAt: 'asc' }],
    });
  }

  async listByMember(memberId: string) {
    return this.prisma.taskAssignee.findMany({
      where: { memberId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            projectId: true,
            project: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async addWatcher(dto: AddTaskWatcherDto) {
    const existing = await this.prisma.taskWatcher.findUnique({
      where: {
        uniq_task_watcher: { taskId: dto.taskId, memberId: dto.memberId },
      },
    });
    if (existing) return existing;
    return this.prisma.taskWatcher.create({
      data: { taskId: dto.taskId, memberId: dto.memberId },
    });
  }

  async removeWatcher(taskId: string, memberId: string) {
    const existing = await this.prisma.taskWatcher.findUnique({
      where: { uniq_task_watcher: { taskId, memberId } },
    });
    if (!existing) throw new NotFoundException('Watcher not found');
    await this.prisma.taskWatcher.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async listWatchers(taskId: string) {
    return this.prisma.taskWatcher.findMany({
      where: { taskId },
      include: {
        member: {
          select: {
            id: true,
            type: true,
            displayName: true,
            handle: true,
            avatarUrl: true,
          },
        },
      },
    });
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
