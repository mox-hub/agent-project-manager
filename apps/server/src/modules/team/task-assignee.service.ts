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
import { MessageBusService } from '@/core/message-bus/message-bus.service';

@Injectable()
export class TaskAssigneeService {
  private readonly logger = new Logger(TaskAssigneeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cliResolution: CliResolutionService,
    private readonly cliDispatch: CliDispatchService,
    private readonly messageBus: MessageBusService,
  ) {}

  async add(dto: CreateTaskAssigneeDto, userId: string) {
    const task = await this.prisma.issue.findUnique({
      where: { id: dto.issueId },
    });
    if (!task) throw new NotFoundException('Task not found');
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    // 检查是否已存在
    const existing = await this.prisma.issueAssignee.findFirst({
      where: {
        issueId: dto.issueId,
        memberId: dto.memberId,
      },
    });

    const result = existing
      ? existing
      : await this.prisma.issueAssignee.create({
          data: {
            issueId: dto.issueId,
            memberId: dto.memberId,
          },
        });

    // 同步主负责人
    const assigneeType = member.type === 'ai_agent' ? 'ai_agent' : 'user';
    await this.prisma.issue.update({
      where: { id: dto.issueId },
      data: {
        assigneeId: member.userId ?? null,
        assigneeType,
        aiAgentId: member.type === 'ai_agent' ? member.id : null,
      },
    });

    // 触发活动
    await this.prisma.issueActivity.create({
      data: {
        projectId: task.projectId,
        issueId: dto.issueId,
        actorId: userId,
        type: 'field_changed',
        summary: `指派给 ${member.displayName}`,
        source: 'user',
      },
    });

    // 触发通知（走事件总线：统一偏好过滤 + 实时推送，订阅者落 Notification）
    if (member.userId) {
      try {
        this.messageBus.publish('task.assigned', {
          issueId: task.id,
          projectId: task.projectId,
          assignedUserId: member.userId,
          assignedMemberName: member.displayName,
          userId,
        });
      } catch (e) {
        this.logger.warn('Task assigned event publish failed', e);
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
          { memberId: member.id },
        );
        this.logger.log(
          `Auto-dispatched task ${dto.issueId} to ${member.displayName} via ${resolved.providerId} (run=${dispatchResult.executionRunId})`,
        );
        // 把 executionRunId 附带返回
        return { ...result, executionRunId: dispatchResult.executionRunId };
      } catch (e) {
        this.logger.warn(
          `Auto-dispatch failed for task ${dto.issueId} (member=${member.id}): ${(e as Error).message}`,
        );
        // 派发失败不阻塞指派本身，把 error 带回给前端
        return { ...result, dispatchError: (e as Error).message };
      }
    }

    return result;
  }

  async bulkSet(dto: BulkSetTaskAssigneesDto, userId: string) {
    const task = await this.prisma.issue.findUnique({
      where: { id: dto.issueId },
    });
    if (!task) throw new NotFoundException('Task not found');

    // 清理当前
    await this.prisma.issueAssignee.deleteMany({
      where: { issueId: dto.issueId },
    });

    const records = await Promise.all(
      dto.assignees.map((a) =>
        this.prisma.issueAssignee.create({
          data: {
            issueId: dto.issueId,
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
        await this.prisma.issue.update({
          where: { id: dto.issueId },
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

  async remove(issueId: string, memberId: string) {
    const existing = await this.prisma.issueAssignee.findFirst({
      where: { issueId, memberId },
    });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.prisma.issueAssignee.delete({ where: { id: existing.id } });

    // 被移除者若是主负责人（Task.assigneeId/aiAgentId 指向该成员）则清空主负责人三字段
    const [task, member] = await Promise.all([
      this.prisma.issue.findUnique({ where: { id: issueId } }),
      this.prisma.member.findUnique({
        where: { id: memberId },
        select: { userId: true, type: true },
      }),
    ]);
    if (!task || !member) return;
    const isPrimary =
      task.aiAgentId === memberId ||
      (member.type !== 'ai_agent' && task.assigneeId === member.userId);
    if (isPrimary) {
      await this.prisma.issue.update({
        where: { id: issueId },
        data: {
          assigneeId: null,
          assigneeType: 'user',
          aiAgentId: null,
        },
      });
    }
  }

  async list(issueId: string) {
    const assignees = await this.prisma.issueAssignee.findMany({
      where: { issueId },
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
    const assignees = await this.prisma.issueAssignee.findMany({
      where: { memberId },
      orderBy: { assignedAt: 'desc' },
    });

    // 手动获取Task信息
    const issueIds = [...new Set(assignees.map((a) => a.issueId))];
    const tasks = await this.prisma.issue.findMany({
      where: { id: { in: issueIds } },
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
      task: taskMap.get(assignee.issueId),
    }));
  }

  async addWatcher(dto: AddTaskWatcherDto) {
    const existing = await this.prisma.issueWatcher.findFirst({
      where: {
        issueId: dto.issueId,
        memberId: dto.memberId,
      },
    });
    if (existing) return existing;
    return this.prisma.issueWatcher.create({
      data: { issueId: dto.issueId, memberId: dto.memberId },
    });
  }

  async removeWatcher(issueId: string, memberId: string) {
    const existing = await this.prisma.issueWatcher.findFirst({
      where: { issueId, memberId },
    });
    if (!existing) throw new NotFoundException('Watcher not found');
    await this.prisma.issueWatcher.delete({ where: { id: existing.id } });
  }

  async listWatchers(issueId: string) {
    const watchers = await this.prisma.issueWatcher.findMany({
      where: { issueId },
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
   * 注：当前 IssueAssignee 模型无 `task` 关系字段，无法用 `task: { status }` 直接过滤，
   * 需先按状态/项目查出候选 issueId，再统计该成员的分配数。
   */
  async getMemberLoad(memberId: string, projectId?: string) {
    const countByTaskStatus = async (statuses: string[]) => {
      const taskWhere: { status: { in: string[] }; projectId?: string } = {
        status: { in: statuses },
      };
      if (projectId) taskWhere.projectId = projectId;

      const issueIds = await this.prisma.issue
        .findMany({ where: taskWhere, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      if (issueIds.length === 0) return 0;

      return this.prisma.issueAssignee.count({
        where: { memberId, issueId: { in: issueIds } },
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
