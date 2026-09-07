import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

/** 订阅者投影（头像栈/弹层选人渲染用） */
export interface SubscriberItem {
  memberId: string;
  displayName: string;
  avatarUrl: string | null;
  type: string; // human | ai_agent
  userId: string | null;
  status: string;
}

/**
 * 页面/实体订阅 —— 订阅按钮（收藏旁）的数据面。
 * 订阅者集合是「全量替换」语义（PUT memberIds），与 Linear 的更改订阅者交互一致。
 */
@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubscribers(
    entityType: string,
    entityId: string,
  ): Promise<{ items: SubscriberItem[] }> {
    const rows = await this.prisma.subscription.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
    const items = await this.resolveMembers(rows.map((r) => r.memberId));
    return { items };
  }

  /** 当前登录用户视角：我的 memberId + 我订阅的页面集合（按钮选中态） */
  async mySubscriptions(userId: string): Promise<{
    memberId: string | null;
    items: Array<{ entityType: string; entityId: string }>;
  }> {
    const member = await this.prisma.member.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!member) return { memberId: null, items: [] };
    const rows = await this.prisma.subscription.findMany({
      where: { memberId: member.id },
      select: { entityType: true, entityId: true },
    });
    return { memberId: member.id, items: rows };
  }

  /** 全量替换订阅者集合；memberId 必须是存在的成员（人类或智能体） */
  async setSubscribers(
    entityType: string,
    entityId: string,
    memberIds: string[],
  ): Promise<{ items: SubscriberItem[] }> {
    const unique = [...new Set(memberIds)];
    if (unique.length > 0) {
      const members = await this.prisma.member.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      const valid = new Set(members.map((m) => m.id));
      const invalid = unique.filter((id) => !valid.has(id));
      if (invalid.length > 0) {
        throw new NotFoundException(`成员不存在：${invalid.join('、')}`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.subscription.deleteMany({
        where: {
          entityType,
          entityId,
          ...(unique.length > 0 ? { memberId: { notIn: unique } } : {}),
        },
      }),
      ...unique.map((memberId) =>
        this.prisma.subscription.upsert({
          where: {
            entityType_entityId_memberId: { entityType, entityId, memberId },
          },
          create: { entityType, entityId, memberId },
          update: {},
        }),
      ),
    ]);

    return this.listSubscribers(entityType, entityId);
  }

  private async resolveMembers(memberIds: string[]): Promise<SubscriberItem[]> {
    if (memberIds.length === 0) return [];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        type: true,
        userId: true,
        status: true,
      },
    });
    const map = new Map(members.map((m) => [m.id, m]));
    return memberIds
      .map((id) => map.get(id))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m) => ({
        memberId: m.id,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        type: m.type,
        userId: m.userId,
        status: m.status,
      }));
  }
}
