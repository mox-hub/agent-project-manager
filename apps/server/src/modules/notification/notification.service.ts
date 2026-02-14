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

  async markNotificationsRead(
    dto: MarkNotificationsReadDto,
    userId: string,
  ) {
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
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [
        { projectId: 'asc' },
        { eventType: 'asc' },
      ],
    });

    return { data: preferences };
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

      const upserted = await this.prisma.notificationPreference.upsert({
        where: {
          userId_projectId_eventType: {
            userId,
            projectId: pref.projectId || null,
            eventType: pref.eventType,
          },
        },
        create: {
          userId,
          projectId: pref.projectId || null,
          eventType: pref.eventType,
          channels: pref.channels as any,
          digestFrequency: pref.digestFrequency || null,
          quietHours: pref.quietHours as any,
          enabled: pref.enabled ?? true,
        },
        update: {
          channels: pref.channels as any,
          digestFrequency: pref.digestFrequency || null,
          quietHours: pref.quietHours as any,
          enabled: pref.enabled ?? true,
        },
      });

      results.push(upserted);
    }

    this.messageBus.publish('notification.preferences.updated', {
      userId,
      preferences: results,
    });

    return { data: results };
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

      // If user has disabled this event type, skip
      if (!preferences.some((p) => p.enabled)) {
        continue;
      }

      // Determine which channels to use
      const channels = this.determineChannels(preferences, eventType);

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

      // Publish event for real-time delivery
      this.messageBus.publish('notification.created', {
        notificationId: notification.id,
        userId,
        type: eventType,
        channels,
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
        enabled: true,
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

  private determineChannels(
    preferences: any[],
    eventType: string,
  ): string[] {
    // Merge channels from all matching preferences
    const channels = new Set<string>();
    for (const pref of preferences) {
      if (Array.isArray(pref.channels)) {
        pref.channels.forEach((ch: string) => channels.add(ch));
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
    const templates: Record<string, (p: any) => { title: string; body: string | null }> = {
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
