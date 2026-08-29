import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export type ActivityEntityType = 'task' | 'bug' | 'project';

export interface ActivityChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface RecordActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  projectId?: string | null;
  actorId?: string | null;
  type: string;
  summary?: string | null;
  content?: string | null;
  changes?: ActivityChange[] | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

const ACTOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录一条操作动态。失败只告警不抛错——业务主流程不应因动态记录失败而中断。
   */
  async record(input: RecordActivityInput): Promise<void> {
    try {
      await this.prisma.activity.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          projectId: input.projectId ?? null,
          actorId: input.actorId ?? null,
          type: input.type,
          summary: input.summary ?? null,
          content: input.content ?? null,
          changes: (input.changes ?? undefined) as never,
          source: input.source ?? null,
          metadata: (input.metadata ?? undefined) as never,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to record activity (${input.entityType}/${input.entityId}/${input.type}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * 实体维度动态列表（含操作人与表情回应），按时间正序返回（旧→新，时间线直读）。
   * entityType 可选：同一实体若改过类型（bug↔task），按 entityId 仍能取到全量历史。
   */
  async listForEntity(
    entityType: ActivityEntityType | undefined,
    entityId: string,
    userId: string,
  ) {
    await this.ensureEntityAccess(entityType ?? 'task', entityId, userId);

    const rows = await this.prisma.activity.findMany({
      where: {
        entityId,
        ...(entityType ? { entityType } : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        actor: { select: ACTOR_SELECT },
        reactions: {
          include: { user: { select: ACTOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: 500,
    });

    return rows.map((row) => this.shapeActivity(row, userId));
  }

  async addComment(
    entityType: ActivityEntityType,
    entityId: string,
    content: string,
    userId: string,
  ) {
    const projectId = await this.ensureEntityAccess(
      entityType,
      entityId,
      userId,
    );

    const created = await this.prisma.activity.create({
      data: {
        entityType,
        entityId,
        projectId,
        actorId: userId,
        type: 'comment',
        content,
        source: 'user',
      },
      include: {
        actor: { select: ACTOR_SELECT },
        reactions: {
          include: { user: { select: ACTOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return this.shapeActivity(created, userId);
  }

  async updateComment(activityId: string, content: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity || activity.type !== 'comment') {
      throw new NotFoundException(`Comment ${activityId} not found`);
    }
    if (activity.actorId !== userId) {
      throw new ForbiddenException('Only the author can edit a comment');
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        content,
        metadata: {
          ...((activity.metadata as Record<string, unknown>) ?? {}),
          edited: true,
        },
      },
      include: {
        actor: { select: ACTOR_SELECT },
        reactions: {
          include: { user: { select: ACTOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return this.shapeActivity(updated, userId);
  }

  async deleteComment(activityId: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity || activity.type !== 'comment') {
      throw new NotFoundException(`Comment ${activityId} not found`);
    }

    // 作者本人，或项目 owner/maintainer 可删
    let canDelete = activity.actorId === userId;
    if (!canDelete && activity.projectId) {
      const membership = await this.prisma.projectMember.findFirst({
        where: {
          projectId: activity.projectId,
          userId,
          role: { in: ['owner', 'maintainer'] },
        },
      });
      canDelete = !!membership;
    }
    if (!canDelete) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.activity.delete({ where: { id: activityId } });
  }

  /** 切换表情回应：已存在则取消，否则添加。返回该活动的最新回应分组。 */
  async toggleReaction(activityId: string, emoji: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, entityType: true, entityId: true },
    });
    if (!activity) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }
    await this.ensureEntityAccess(
      activity.entityType as ActivityEntityType,
      activity.entityId,
      userId,
    );

    const existing = await this.prisma.activityReaction.findUnique({
      where: {
        activityId_userId_emoji: { activityId, userId, emoji },
      },
    });
    if (existing) {
      await this.prisma.activityReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.activityReaction.create({
        data: { activityId, userId, emoji },
      });
    }

    const reactions = await this.prisma.activityReaction.findMany({
      where: { activityId },
      include: { user: { select: ACTOR_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
    return this.shapeReactions(reactions, userId);
  }

  /**
   * 实体访问校验：任务/Bug 走任务可见性（项目成员，或无项目时 reporter/assignee）；
   * 项目走成员校验。返回实体归属的 projectId（用于动态冗余落库）。
   */
  private async ensureEntityAccess(
    entityType: ActivityEntityType,
    entityId: string,
    userId: string,
  ): Promise<string | null> {
    if (entityType === 'project') {
      const project = await this.prisma.project.findFirst({
        where: { id: entityId, members: { some: { userId } } },
        select: { id: true },
      });
      if (!project) {
        throw new NotFoundException(`Project ${entityId} not found`);
      }
      return project.id;
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: entityId,
        OR: [
          { project: { members: { some: { userId } } } },
          { assigneeId: userId, projectId: null },
          { reporterId: userId, projectId: null },
        ],
      },
      select: { projectId: true },
    });
    if (!task) {
      throw new NotFoundException(`Task ${entityId} not found`);
    }
    return task.projectId;
  }

  private shapeActivity(
    row: {
      id: string;
      entityType: string;
      entityId: string;
      projectId: string | null;
      actorId: string | null;
      type: string;
      summary: string | null;
      content: string | null;
      changes: unknown;
      source: string | null;
      metadata: unknown;
      createdAt: Date;
      actor: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      } | null;
      reactions: Array<{
        emoji: string;
        userId: string;
        user: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        };
      }>;
    },
    userId: string,
  ) {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      projectId: row.projectId,
      type: row.type,
      summary: row.summary,
      content: row.content,
      changes: row.changes ?? null,
      source: row.source,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
      actor: row.actor,
      reactions: this.shapeReactions(row.reactions, userId),
    };
  }

  private shapeReactions(
    reactions: Array<{
      emoji: string;
      userId: string;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
    }>,
    userId: string,
  ) {
    const groups = new Map<
      string,
      {
        emoji: string;
        count: number;
        users: (typeof reactions)[number]['user'][];
        reactedByMe: boolean;
      }
    >();
    for (const reaction of reactions) {
      const group = groups.get(reaction.emoji) ?? {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        reactedByMe: false,
      };
      group.count += 1;
      group.users.push(reaction.user);
      if (reaction.userId === userId) group.reactedByMe = true;
      groups.set(reaction.emoji, group);
    }
    return [...groups.values()];
  }
}
