import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  CreateTaskAssigneeDto,
  BulkSetTaskAssigneesDto,
  AddTaskWatcherDto,
} from './dto/task-assignee.dto';
import { Prisma } from '@prisma/client';
import { CliResolutionService } from '@/modules/cli-dispatch/cli-resolution.service';
import { CliDispatchService } from '@/modules/cli-dispatch/dispatch.service';

@Injectable()
export class TaskAssigneeService {
  private readonly logger = new Logger(TaskAssigneeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cliResolution: CliResolutionService,
    private readonly cliDispatch: CliDispatchService,
  ) {}

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

    // 垂直切片 hook: AI 员工自动派发 CLI
    if (member.type === 'ai_agent' && task.projectId) {
      try {
        const resolved = await this.cliResolution.resolveForMember(
          member.id,
          task.projectId,
        );
        const dispatchResult = await this.cliDispatch.dispatchTaskToCli(
          task.id,
          userId,
          {
            agentBindingId: resolved.agentBindingId ?? undefined,
            providerId: resolved.providerId as
              'claude-code' | 'codex' | 'zcode',
          },
        );
        this.logger.log(
          `Auto-dispatched task ${dto.taskId} to ${member.displayName} via ${resolved.providerId} (run=${dispatchResult.executionRunId})`,
        );
        // 把 executionRunId 附带返回
        return { ...result, executionRunId: dispatchResult.executionRunId };
      } catch (e) {
        this.logger.warn(
          `Auto-dispatch failed for task ${dto.taskId} (member=${member.id}): ${(e as Error).message}`,
        );
        // 派发失败不阻塞指派本身，把 error 带回给前端
        return { ...result, dispatchError: (e as Error).message };
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
  }

  async list(taskId: string) {
    const assignees = await this.prisma.taskAssignee.findMany({
      where: { taskId },
      orderBy: { assignedAt: 'asc' },
    });

    // 手动获取Member信息
    const memberIds = [...new Set(assignees.map((a) => a.memberId))];
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
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return assignees.map((assignee) => ({
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
    const taskIds = [...new Set(assignees.map((a) => a.taskId))];
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
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    return assignees.map((assignee) => ({
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
  }

  async listWatchers(taskId: string) {
    const watchers = await this.prisma.taskWatcher.findMany({
      where: { taskId },
    });

    // 手动获取Member信息
    const memberIds = [...new Set(watchers.map((w) => w.memberId))];
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
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return watchers.map((watcher) => ({
      ...watcher,
      member: memberMap.get(watcher.memberId),
    }));
  }

  /**
   * 获取成员在某项目下的负载统计
   *
   * 注：当前 TaskAssignee 模型无 `task` 关系字段，无法用 `task: { status }` 直接过滤，
   * 需先按状态/项目查出候选 taskId，再统计该成员的分配数。
   */
  async getMemberLoad(memberId: string, projectId?: string) {
    const countByTaskStatus = async (statuses: string[]) => {
      const taskWhere: { status: { in: string[] }; projectId?: string } = {
        status: { in: statuses },
      };
      if (projectId) taskWhere.projectId = projectId;

      const taskIds = await this.prisma.task
        .findMany({ where: taskWhere, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      if (taskIds.length === 0) return 0;

      return this.prisma.taskAssignee.count({
        where: { memberId, taskId: { in: taskIds } },
      });
    };

    const [todo, inProgress, completed] = await Promise.all([
      countByTaskStatus(['todo', 'backlog']),
      countByTaskStatus(['in_progress', 'pending_approval']),
      countByTaskStatus(['done', 'completed']),
    ]);
    return {
      todo,
      inProgress,
      completed,
      total: todo + inProgress + completed,
    };
  }
}
