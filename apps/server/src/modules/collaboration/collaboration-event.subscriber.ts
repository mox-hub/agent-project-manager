import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../../core/database/prisma.service';

/**
 * 协作卡流转 → 通知：状态推进的"对方"与项目人类成员收到提醒。
 * 交接是异步协作，人始终在闸口可见（每一环都是事件不是聊天记录）。
 */
@Injectable()
export class CollaborationEventSubscriber implements OnModuleInit {
  constructor(
    private readonly messageBus: MessageBusService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.messageBus.subscribe(
      'collaboration.updated',
      this.handleCollaborationUpdated.bind(this),
    );
  }

  private async handleCollaborationUpdated(payload: {
    cardId?: string;
    projectId?: string;
    status?: string;
    title?: string;
    toMemberId?: string;
    byMemberId?: string;
  }): Promise<void> {
    try {
      if (!payload?.projectId) return;

      // 受众：请求方/提供方若为人类成员 → 直接归属用户；否则项目人类成员兜底
      const memberIds = [payload.toMemberId, payload.byMemberId].filter(
        (id): id is string => !!id,
      );
      const members = memberIds.length
        ? await this.prisma.member.findMany({
            where: {
              id: { in: memberIds },
              type: 'human',
              userId: { not: null },
            },
            select: { userId: true },
          })
        : [];
      let userIds = members
        .map((m) => m.userId)
        .filter((id): id is string => !!id);

      if (userIds.length === 0) {
        // 双方都是 AI：通知项目人类成员（人在闸口监督）
        const projectMembers = await this.prisma.projectMember.findMany({
          where: {
            projectId: payload.projectId,
            user: { id: { not: undefined } },
          },
          select: { userId: true },
          take: 50,
        });
        userIds = projectMembers.map((pm) => pm.userId);
      }
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'collaboration.updated',
        {
          cardId: payload.cardId,
          title: payload.title,
          status: payload.status,
          projectId: payload.projectId,
        },
        userIds,
      );
    } catch {
      // 通知是旁路：失败不阻断协作卡流转
    }
  }
}
