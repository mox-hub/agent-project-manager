import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preference.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  async getNotifications(query: NotificationQueryDto, userId: string) {
    const where: any = {
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;
    const skip = (page - 1) * pageSize;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        pageSize,
        total,
      },
    };
  }

  async getUnreadCount(userId: string, projectId?: string) {
    const where: any = {
      userId,
      status: 'unread',
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const count = await this.prisma.notification.count({ where });
    return { count };
  }

  async markNotificationsRead(dto: MarkNotificationsReadDto, userId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: {
        id: { in: dto.ids },
        userId,
        status: 'unread',
      },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    // Publish event for real-time updates
    this.messageBus.publish('notification.read', {
      userId,
      notificationIds: dto.ids,
    });

    return { count: updated.count };
  }

  async getNotificationPreferences(userId: string) {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ projectId: 'asc' }, { eventType: 'asc' }],
    });
    // channels 为 String 列（JSON 串），对外按数组返回与写入形状对齐
    return rows.map((row) => {
      let channels: unknown = row.channels;
      if (typeof channels === 'string') {
        try {
          channels = JSON.parse(channels);
        } catch {
          channels = channels ? [channels] : [];
        }
      }
      return { ...row, channels };
    });
  }

  async updateNotificationPreferences(
    dto: UpdateNotificationPreferencesDto,
    userId: string,
  ) {
    const results = [];

    for (const pref of dto.preferences) {
      // Verify project access if projectId is provided
      if (pref.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: pref.projectId },
          include: { members: true },
        });
        if (!project) {
          throw new NotFoundException(`Project ${pref.projectId} not found`);
        }
        const isMember = project.members.some((m) => m.userId === userId);
        if (!isMember) {
          continue; // Skip preferences for projects user doesn't have access to
        }
      }

      const projectIdValue = pref.projectId ?? null;

      // First try to find existing preference
      const existing = await this.prisma.notificationPreference.findFirst({
        where: {
          userId,
          projectId: projectIdValue,
          eventType: pref.eventType,
        },
      });

      let upserted;
      if (existing) {
        upserted = await this.prisma.notificationPreference.update({
          where: { id: existing.id },
          data: {
            channels: JSON.stringify(pref.channels),
            digestFrequency: pref.digestFrequency || null,
            quietHoursStart: pref.quietHours?.start || null,
            quietHoursEnd: pref.quietHours?.end || null,
            quietHoursTimezone: pref.quietHours?.timezone || null,
            enabled: pref.enabled ?? true,
          },
        });
      } else {
        upserted = await this.prisma.notificationPreference.create({
          data: {
            userId,
            projectId: projectIdValue,
            eventType: pref.eventType,
            channels: JSON.stringify(pref.channels),
            digestFrequency: pref.digestFrequency || null,
            quietHoursStart: pref.quietHours?.start || null,
            quietHoursEnd: pref.quietHours?.end || null,
            quietHoursTimezone: pref.quietHours?.timezone || null,
            enabled: pref.enabled ?? true,
          },
        });
      }

      results.push(upserted);
    }

    this.messageBus.publish('notification.preferences.updated', {
      userId,
      preferences: results,
    });

    return results;
  }

  // Internal method to create notification from event
  async createNotificationFromEvent(
    eventType: string,
    payload: any,
    affectedUserIds: string[],
  ) {
    const notifications = [];

    for (const userId of affectedUserIds) {
      // Get user preferences for this event type
      const preferences = await this.getUserPreferencesForEvent(
        userId,
        eventType,
        payload.projectId,
      );

      // 无显式偏好 = 默认开启（in-app）；
      // 仅当存在显式偏好且全部关闭时才跳过（[].some() 恒为 false，
      // 不能用 some 判断「未配置」的用户，否则他们永远收不到通知）
      const enabledPreferences = preferences.filter((p) => p.enabled);
      if (preferences.length > 0 && enabledPreferences.length === 0) {
        continue;
      }

      // Determine which channels to use
      const channels = this.determineChannels(enabledPreferences, eventType);

      // Generate notification title and body
      const { title, body } = this.generateNotificationContent(
        eventType,
        payload,
      );

      // Create notification (always create in-app notification)
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: eventType,
          title,
          body,
          projectId: payload.projectId || null,
          taskId: payload.taskId || null,
          channels: channels as any,
          status: 'unread',
          payloadJson: payload as any,
        },
      });

      notifications.push(notification);

      // Publish event for real-time delivery（title/body 供系统横幅直接展示）
      this.messageBus.publish('notification.created', {
        notificationId: notification.id,
        userId,
        type: eventType,
        channels,
        title,
        body,
      });
    }

    return notifications;
  }

  private async getUserPreferencesForEvent(
    userId: string,
    eventType: string,
    projectId?: string,
  ) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: {
        userId,
        // 注意：不在此过滤 enabled——调用方需要区分「未配置」（默认开启）
        // 与「显式关闭」（跳过），预过滤会让关闭行隐身、语义退化为同一分支
        OR: [
          { projectId: null }, // Global preferences
          ...(projectId ? [{ projectId }] : []), // Project-specific preferences
        ],
      },
    });

    // Filter preferences that match the event type (support wildcards like 'task.*')
    return preferences.filter((p) => {
      if (p.eventType === eventType) return true;
      if (p.eventType.endsWith('.*')) {
        const prefix = p.eventType.slice(0, -2);
        return eventType.startsWith(prefix + '.');
      }
      return false;
    });
  }

  private determineChannels(preferences: any[], eventType: string): string[] {
    // Merge channels from all matching preferences
    // （NotificationPreference.channels 是 String 列，存 JSON 串；Notification.channels 才是 Json 数组）
    const channels = new Set<string>();
    for (const pref of preferences) {
      const stored: unknown =
        typeof pref.channels === 'string'
          ? (() => {
              try {
                return JSON.parse(pref.channels);
              } catch {
                return pref.channels ? [pref.channels] : [];
              }
            })()
          : pref.channels;
      if (Array.isArray(stored)) {
        stored.forEach((ch: string) => channels.add(ch));
      }
    }
    // Always include 'in-app' if no preferences found
    if (channels.size === 0) {
      channels.add('in-app');
    }
    return Array.from(channels);
  }

  private generateNotificationContent(
    eventType: string,
    payload: any,
  ): { title: string; body: string | null } {
    // Simple template-based content generation
    // In production, use a proper template engine
    const templates: Record<
      string,
      (p: any) => { title: string; body: string | null }
    > = {
      'task.assigned': (p) => ({
        title: `你被分配了新任务：${p.taskTitle || '未命名任务'}`,
        body: `项目：${p.projectName || '未知项目'}，任务：${p.taskTitle || '未命名任务'}`,
      }),
      'task.statusChanged': (p) => ({
        title: `任务状态已更新：${p.taskTitle || '未命名任务'}`,
        body: `任务 "${p.taskTitle || '未命名任务'}" 的状态从 "${p.oldStatus}" 变更为 "${p.newStatus}"`,
      }),
      'task.created': (p) => ({
        title: `新任务已创建：${p.taskTitle || '未命名任务'}`,
        body: `项目：${p.projectName || '未知项目'}`,
      }),
      'ci.build.failed': (p) => ({
        title: `构建失败：${p.buildName || '未知构建'}`,
        body: `项目：${p.projectName || '未知项目'}，构建：${p.buildName || '未知构建'}`,
      }),
      'ci.build.succeeded': (p) => ({
        title: `构建成功：${p.buildName || '未知构建'}`,
        body: `项目：${p.projectName || '未知项目'}`,
      }),
      'ai.workflow.completed': (p) => ({
        title: `AI 工作流已完成：${p.workflowName || '未知工作流'}`,
        body: `工作流 "${p.workflowName || '未知工作流'}" 已成功完成`,
      }),
      'task.deleted': (p) => ({
        title: `任务已删除：${p.taskTitle || '未命名任务'}`,
        body: p.projectName ? `项目：${p.projectName}` : null,
      }),
      'document.created': (p) => ({
        title: `新文档已创建：${p.title || '未命名文档'}`,
        body: p.projectName ? `项目：${p.projectName}` : null,
      }),
      'document.deleted': (p) => ({
        title: `文档已删除：${p.title || '未命名文档'}`,
        body: p.projectName ? `项目：${p.projectName}` : null,
      }),
      'project.created': (p) => ({
        title: `新项目已创建：${p.projectName || p.project?.name || '未命名项目'}`,
        body: null,
      }),
      'project.archived': (p) => ({
        title: `项目已归档：${p.projectName || '未命名项目'}`,
        body: null,
      }),
      'member.created': (p) => ({
        title: `新成员加入：${p.displayName || '未知成员'}`,
        body: null,
      }),
      'member.removed': (p) => ({
        title: `成员已移除：${p.displayName || '未知成员'}`,
        body: null,
      }),
      'team.created': (p) => ({
        title: `新团队已创建：${p.teamName || '未命名团队'}`,
        body: null,
      }),
      'team.archived': (p) => ({
        title: `团队已归档：${p.teamName || '未命名团队'}`,
        body: null,
      }),
      'acceptance.created': (p) => ({
        title: `新验收单：${p.title || '未命名验收单'}`,
        body: null,
      }),
      'acceptance.resolved': (p) => {
        const actionText =
          p.action === 'accept'
            ? '通过'
            : p.action === 'reject'
              ? '驳回'
              : '豁免';
        return {
          title: `验收已${actionText}：${p.title || '未命名验收单'}`,
          body: null,
        };
      },
      'milestone.created': (p) => ({
        title: `新里程碑：${p.name || '未命名里程碑'}`,
        body: null,
      }),
      'tag.created': (p) => ({
        title: `新标签：${p.name || '未命名标签'}`,
        body: null,
      }),
      'tag.deleted': (p) => ({
        title: `标签已删除：${p.name || '未命名标签'}`,
        body: null,
      }),
      'task.fieldChanged': (p) => {
        const fieldNames = Array.isArray(p.fields)
          ? p.fields
              .map((f: string) =>
                f === 'priority' ? '优先级' : f === 'dueDate' ? '截止日期' : f,
              )
              .join('、')
          : '字段';
        return {
          title: `任务${fieldNames}变更：${p.taskTitle || '未命名任务'}`,
          body: p.projectName ? `项目：${p.projectName}` : null,
        };
      },
      'task.commented': (p) => ({
        title: `新评论：${p.taskTitle || p.entityId || '条目'}`,
        body: p.excerpt ? String(p.excerpt).slice(0, 100) : null,
      }),
      'execution.terminal': (p) => ({
        title:
          p.status === 'failed'
            ? `智能体任务失败：${p.goal || '未知目标'}`
            : `智能体任务完成：${p.goal || '未知目标'}`,
        body: null,
      }),
      'mention.created': (p) => ({
        title: '有人提到了你',
        body: p.text ? String(p.text).slice(0, 100) : null,
      }),
    };

    const template = templates[eventType];
    if (template) {
      return template(payload);
    }

    // Default template
    return {
      title: `新通知：${eventType}`,
      body: JSON.stringify(payload),
    };
  }
}
