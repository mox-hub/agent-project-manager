import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventTypes } from '@/core/message-bus/domain-events';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

/**
 * 订阅变更推送 —— 「页面内容变动 → 通知订阅者」的枢纽。
 *
 * 与全域广播（notification-event-subscriber 发项目成员）的分工：
 * 本订阅者只负责「订阅者增量」事件——全域层未覆盖、或覆盖人群不同的四类
 * （对应通知设置的 状态变更/优先级与截止日期/评论/智能体活动）：
 * - task.statusChanged  全域层只通知负责人；此处通知 订阅了该任务/所属项目 的人（排除负责人与操作者，防双份）
 * - task.fieldChanged   优先级/截止日期变更（全新类型）
 * - task.commented      评论（activity.addComment 发布）
 * - execution.terminal  智能体执行完成/失败
 * 订阅者含智能体成员，但其无 userId，自动跳过（仅在订阅列表中展示）。
 */
@Injectable()
export class SubscriptionEventSubscriber implements OnModuleInit {
  constructor(
    private readonly messageBus: MessageBusService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SubscriptionEventSubscriber');
  }

  onModuleInit() {
    this.messageBus.subscribe(
      DomainEventTypes.TaskUpdated,
      this.handleTaskUpdated.bind(this),
    );
    this.messageBus.subscribe(
      DomainEventTypes.TaskCommented,
      this.handleTaskCommented.bind(this),
    );
    this.messageBus.subscribe(
      DomainEventTypes.ExecutionRunUpdated,
      this.handleExecutionUpdated.bind(this),
    );
    this.logger.log('Subscription event subscriber initialized');
  }

  /** scopes 内全部订阅者（人类、active）→ 通知；排除操作者/负责人等已知晓人 */
  private async notifySubscribers(
    scopes: Array<{ entityType: string; entityId: string }>,
    eventType: string,
    payload: Record<string, unknown>,
    excludeUserIds: Array<string | null | undefined> = [],
  ) {
    const validScopes = scopes.filter((s) => s.entityId);
    if (validScopes.length === 0) return;

    const subs = await this.prisma.subscription.findMany({
      where: { OR: validScopes },
      select: { memberId: true },
    });
    if (subs.length === 0) return;

    const memberIds = [...new Set(subs.map((s) => s.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds }, userId: { not: null }, status: 'active' },
      select: { userId: true },
    });
    const excluded = new Set(excludeUserIds.filter((v): v is string => !!v));
    const userIds = [...new Set(members.map((m) => m.userId as string))].filter(
      (id) => !!id && !excluded.has(id),
    );
    if (userIds.length === 0) return;

    await this.notificationService.createNotificationFromEvent(
      eventType,
      payload,
      userIds,
    );
  }

  private async handleTaskUpdated(payload: any) {
    try {
      const task = await this.prisma.issue.findUnique({
        where: { id: payload.issueId },
        include: { project: { select: { id: true, name: true } } },
      });
      if (!task) return;

      const scopes = [
        { entityType: 'task', entityId: task.id },
        ...(task.projectId
          ? [{ entityType: 'project', entityId: task.projectId }]
          : []),
      ];

      if (payload.statusChanged) {
        await this.notifySubscribers(
          scopes,
          DomainEventTypes.TaskStatusChanged,
          {
            issueId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            projectName: task.project?.name,
            oldStatus: payload.oldStatus,
            newStatus: payload.newStatus,
          },
          [task.assigneeId, payload.userId],
        );
        return;
      }

      const changedFields: string[] = Array.isArray(payload.changedFields)
        ? payload.changedFields
        : [];
      // 任意字段变更都通知订阅者（用户预期「订阅后任务任何变动都有提醒」）。
      // status 恒 false 时可能仍出现在 changedFields（提交了同值），剔除防误导；
      // 状态实际流转已由上方分支以专属文案处理并 return，不会双份。
      const fields = changedFields.filter(
        (f) => f !== 'status' || payload.statusChanged,
      );
      if (fields.length > 0) {
        await this.notifySubscribers(
          scopes,
          DomainEventTypes.TaskFieldChanged,
          {
            issueId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            projectName: task.project?.name,
            fields,
          },
          [payload.userId],
        );
      }
    } catch (error) {
      this.logger.error(
        'Error handling task.updated for subscribers',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTaskCommented(payload: any) {
    try {
      const isTaskish =
        payload.entityType === 'task' || payload.entityType === 'bug';
      const scopes = isTaskish
        ? [
            { entityType: 'task', entityId: String(payload.entityId) },
            ...(payload.projectId
              ? [{ entityType: 'project', entityId: String(payload.projectId) }]
              : []),
          ]
        : [
            {
              entityType: String(payload.entityType),
              entityId: String(payload.entityId),
            },
          ];

      const task = isTaskish
        ? await this.prisma.issue.findUnique({
            where: { id: String(payload.entityId) },
            select: { title: true },
          })
        : null;

      await this.notifySubscribers(
        scopes,
        DomainEventTypes.TaskCommented,
        {
          entityType: payload.entityType,
          entityId: payload.entityId,
          issueId: isTaskish ? payload.entityId : undefined,
          taskTitle: task?.title,
          projectId: payload.projectId,
          excerpt: payload.excerpt,
          commentBy: payload.actorId,
        },
        [payload.actorId],
      );
    } catch (error) {
      this.logger.error(
        'Error handling task.commented for subscribers',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleExecutionUpdated(payload: any) {
    try {
      const status = String(payload.newStatus ?? '');
      if (!['completed', 'failed'].includes(status)) return;

      const run = await this.prisma.execution.findUnique({
        where: { id: payload.executionRunId },
        select: { id: true, goal: true, projectId: true, issueId: true },
      });
      if (!run) return;

      const scopes = [
        ...(run.issueId ? [{ entityType: 'task', entityId: run.issueId }] : []),
        { entityType: 'project', entityId: run.projectId },
      ];

      await this.notifySubscribers(
        scopes,
        DomainEventTypes.ExecutionTerminal,
        {
          executionRunId: run.id,
          goal: run.goal,
          status,
          projectId: run.projectId,
          issueId: run.issueId,
        },
        [payload.userId],
      );
    } catch (error) {
      this.logger.error(
        'Error handling execution.run.updated for subscribers',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
