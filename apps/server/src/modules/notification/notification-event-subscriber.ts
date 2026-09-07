import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

/**
 * 领域事件 → 通知 的统一枢纽。
 * 领域服务只负责 publish（成员/团队/验收/里程碑/标签等已在各自 service 落点），
 * 本订阅者统一解析受众（项目成员/工作区成员，均排除操作者）并落通知。
 */
@Injectable()
export class NotificationEventSubscriber implements OnModuleInit {
  constructor(
    private readonly messageBus: MessageBusService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('NotificationEventSubscriber');
  }

  onModuleInit() {
    // Task 事件
    this.messageBus.subscribe(
      'task.created',
      this.handleTaskCreated.bind(this),
    );
    this.messageBus.subscribe(
      'task.updated',
      this.handleTaskUpdated.bind(this),
    );
    this.messageBus.subscribe(
      'task.assigned',
      this.handleTaskAssigned.bind(this),
    );
    this.messageBus.subscribe(
      'task.deleted',
      this.handleTaskDeleted.bind(this),
    );

    // Document 事件（document.service 发布）
    this.messageBus.subscribe(
      'document.created',
      this.handleDocumentCreated.bind(this),
    );
    this.messageBus.subscribe(
      'document.deleted',
      this.handleDocumentDeleted.bind(this),
    );

    // Project 事件
    this.messageBus.subscribe(
      'project.created',
      this.handleProjectCreated.bind(this),
    );
    this.messageBus.subscribe(
      'project.archived',
      this.handleProjectArchived.bind(this),
    );

    // Member / Team 事件（工作区级，受众=工作区成员）
    this.messageBus.subscribe(
      'member.created',
      this.handleMemberCreated.bind(this),
    );
    this.messageBus.subscribe(
      'member.removed',
      this.handleMemberRemoved.bind(this),
    );
    this.messageBus.subscribe(
      'team.created',
      this.handleTeamCreated.bind(this),
    );
    this.messageBus.subscribe(
      'team.archived',
      this.handleTeamArchived.bind(this),
    );

    // Acceptance / Milestone / Tag 事件
    this.messageBus.subscribe(
      'acceptance.created',
      this.handleAcceptanceCreated.bind(this),
    );
    this.messageBus.subscribe(
      'acceptance.resolved',
      this.handleAcceptanceResolved.bind(this),
    );
    this.messageBus.subscribe(
      'acceptance.deleted',
      this.handleAcceptanceDeleted.bind(this),
    );
    this.messageBus.subscribe(
      'milestone.created',
      this.handleMilestoneCreated.bind(this),
    );
    this.messageBus.subscribe('tag.created', this.handleTagCreated.bind(this));
    this.messageBus.subscribe('tag.deleted', this.handleTagDeleted.bind(this));

    // CI 事件（Integration 模块预留发布方）
    this.messageBus.subscribe(
      'ci.build.failed',
      this.handleCIBuildFailed.bind(this),
    );
    this.messageBus.subscribe(
      'ci.build.succeeded',
      this.handleCIBuildSucceeded.bind(this),
    );

    // AI 工作流事件
    this.messageBus.subscribe(
      'ai.workflow.completed',
      this.handleAIWorkflowCompleted.bind(this),
    );

    // 提及事件（mention.service.parseAndCreate 发布，直发被 @ 用户）
    this.messageBus.subscribe(
      'mention.created',
      this.handleMentionCreated.bind(this),
    );

    this.logger.log('Notification event subscriber initialized');
  }

  // ─── 受众解析 ───────────────────────────────────────────

  /** 项目成员 userId 集合（排除操作者、去重） */
  private async projectMemberIds(
    projectId?: string | null,
    excludeUserId?: string,
  ): Promise<string[]> {
    if (!projectId) return [];
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) return [];
    const ids = [
      ...new Set(
        project.members.map((m) => m.userId).filter((v): v is string => !!v),
      ),
    ];
    return excludeUserId ? ids.filter((id) => id !== excludeUserId) : ids;
  }

  /** 工作区成员 userId 集合（排除操作者） */
  private async workspaceUserIds(excludeUserId?: string): Promise<string[]> {
    const members = await this.prisma.member.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
    });
    const ids = [
      ...new Set(members.map((m) => m.userId).filter((v): v is string => !!v)),
    ];
    return excludeUserId ? ids.filter((id) => id !== excludeUserId) : ids;
  }

  // ─── Task ───────────────────────────────────────────────

  private async handleTaskCreated(payload: any) {
    try {
      const task = await this.prisma.issue.findUnique({
        where: { id: payload.issueId },
        include: {
          project: {
            include: { members: true },
          },
          assignee: true,
        },
      });

      if (!task) return;

      // 无项目 (inbox) 时跳过项目成员通知, 后续可扩展为通知 reporter
      if (!task.project) return;

      // Notify project members (except creator；task.created 载荷的操作者是 payload.userId)
      const creatorId = payload.createdBy ?? payload.userId;
      const userIds = task.project.members
        .filter((m) => m.userId !== creatorId)
        .map((m) => m.userId)
        .filter((v): v is string => !!v);

      if (userIds.length > 0) {
        await this.notificationService.createNotificationFromEvent(
          'task.created',
          {
            issueId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            projectName: task.project.name,
            createdBy: creatorId,
          },
          userIds,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error handling task.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTaskUpdated(payload: any) {
    try {
      const task = await this.prisma.issue.findUnique({
        where: { id: payload.issueId },
        include: {
          project: {
            include: { members: true },
          },
          assignee: true,
        },
      });

      if (!task) return;

      // Notify assignee if status changed
      if (payload.statusChanged && task.assigneeId && task.project) {
        await this.notificationService.createNotificationFromEvent(
          'task.statusChanged',
          {
            issueId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            projectName: task.project.name,
            oldStatus: payload.oldStatus,
            newStatus: payload.newStatus,
          },
          [task.assigneeId],
        );
      }
    } catch (error) {
      this.logger.error(
        'Error handling task.updated event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTaskAssigned(payload: any) {
    try {
      const task = await this.prisma.issue.findUnique({
        where: { id: payload.issueId },
        include: {
          project: true,
          assignee: true,
        },
      });

      if (!task || !task.project) return;

      // issue-assignee.service 发布时带 assignedUserId；兜底任务主负责人
      const targetUserId: string | null =
        (payload.assignedUserId as string | undefined) ?? task.assigneeId;
      if (!targetUserId) return;

      await this.notificationService.createNotificationFromEvent(
        'task.assigned',
        {
          issueId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
          projectName: task.project.name,
          assignedMemberName: payload.assignedMemberName,
        },
        [targetUserId],
      );
    } catch (error) {
      this.logger.error(
        'Error handling task.assigned event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTaskDeleted(payload: any) {
    try {
      const userIds = await this.projectMemberIds(
        payload.projectId,
        payload.userId,
      );
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'task.deleted',
        {
          issueId: payload.issueId,
          taskTitle: payload.taskTitle,
          projectId: payload.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling task.deleted event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── Document ───────────────────────────────────────────

  private async handleDocumentCreated(payload: any) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: payload.documentId },
        include: { project: { include: { members: true } } },
      });
      if (!document) return;

      const userIds = (document.project?.members ?? [])
        .filter((m) => m.userId && m.userId !== payload.authorId)
        .map((m) => m.userId as string);
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'document.created',
        {
          documentId: document.id,
          title: document.title,
          projectId: document.projectId,
          projectName: document.project?.name,
          createdBy: payload.authorId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling document.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleDocumentDeleted(payload: any) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: payload.documentId },
        include: { project: { include: { members: true } } },
      });
      if (!document) return;

      const userIds = (document.project?.members ?? [])
        .filter((m) => m.userId && m.userId !== payload.userId)
        .map((m) => m.userId as string);
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'document.deleted',
        {
          documentId: document.id,
          title: document.title,
          projectId: document.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling document.deleted event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── Project ────────────────────────────────────────────

  private async handleProjectCreated(payload: any) {
    try {
      const userIds = await this.projectMemberIds(
        payload.projectId,
        payload.userId,
      );
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'project.created',
        {
          projectId: payload.projectId,
          projectName: payload.project?.name,
          createdBy: payload.userId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling project.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleProjectArchived(payload: any) {
    try {
      const userIds = await this.projectMemberIds(
        payload.projectId,
        payload.userId,
      );
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'project.archived',
        {
          projectId: payload.projectId,
          projectName: payload.projectName,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling project.archived event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── Member / Team（工作区级）───────────────────────────

  private async handleMemberCreated(payload: any) {
    try {
      // 系统内置 AI 助理启动补齐时不发通知（无操作者）
      if (!payload.userId) return;
      const userIds = await this.workspaceUserIds(payload.userId);
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'member.created',
        {
          memberId: payload.memberId,
          displayName: payload.displayName,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling member.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleMemberRemoved(payload: any) {
    try {
      const userIds = await this.workspaceUserIds();
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'member.removed',
        {
          memberId: payload.memberId,
          displayName: payload.displayName,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling member.removed event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTeamCreated(payload: any) {
    try {
      const userIds = await this.workspaceUserIds(payload.userId);
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'team.created',
        {
          teamId: payload.teamId,
          teamName: payload.name,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling team.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTeamArchived(payload: any) {
    try {
      const userIds = await this.workspaceUserIds();
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'team.archived',
        {
          teamId: payload.teamId,
          teamName: payload.name,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling team.archived event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── Acceptance / Milestone / Tag ───────────────────────

  private async handleAcceptanceCreated(payload: any) {
    try {
      const userIds = await this.projectMemberIds(
        payload.projectId,
        payload.userId,
      );
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'acceptance.created',
        {
          acceptanceId: payload.acceptanceId,
          title: payload.title,
          issueId: payload.issueId,
          projectId: payload.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling acceptance.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleAcceptanceResolved(payload: any) {
    try {
      const acceptance = await this.prisma.acceptance.findUnique({
        where: { id: payload.acceptanceId },
        include: {
          issue: { include: { project: { include: { members: true } } } },
        },
      });
      if (!acceptance?.issue?.project) return;

      const userIds = acceptance.issue.project.members
        .filter((m) => m.userId && m.userId !== payload.userId)
        .map((m) => m.userId as string);
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'acceptance.resolved',
        {
          acceptanceId: acceptance.id,
          title: acceptance.title,
          action: payload.action,
          issueId: acceptance.issueId,
          projectId: acceptance.issue.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling acceptance.resolved event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleAcceptanceDeleted(payload: any) {
    try {
      const userIds = await this.projectMemberIds(
        payload.projectId,
        payload.userId,
      );
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'acceptance.deleted',
        {
          acceptanceId: payload.acceptanceId,
          title: payload.title,
          issueId: payload.issueId,
          projectId: payload.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling acceptance.deleted event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleMilestoneCreated(payload: any) {
    try {
      const userIds = await this.projectMemberIds(
        payload.projectId,
        payload.userId,
      );
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'milestone.created',
        {
          milestoneId: payload.milestoneId,
          name: payload.name,
          projectId: payload.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling milestone.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTagCreated(payload: any) {
    try {
      const userIds = payload.projectId
        ? await this.projectMemberIds(payload.projectId, payload.userId)
        : await this.workspaceUserIds(payload.userId);
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'tag.created',
        {
          tagId: payload.tagId,
          name: payload.name,
          projectId: payload.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling tag.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleTagDeleted(payload: any) {
    try {
      const userIds = payload.projectId
        ? await this.projectMemberIds(payload.projectId)
        : await this.workspaceUserIds();
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'tag.deleted',
        {
          tagId: payload.tagId,
          name: payload.name,
          projectId: payload.projectId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling tag.deleted event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleMentionCreated(payload: any) {
    try {
      const mentionedUserIds: string[] = Array.isArray(payload.mentionedUserIds)
        ? payload.mentionedUserIds.filter(
            (v: unknown): v is string => typeof v === 'string',
          )
        : [];
      const userIds = mentionedUserIds.filter((id) => id !== payload.actorId);
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'mention.created',
        {
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          text: payload.text,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling mention.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── CI / AI Workflow（既有）────────────────────────────

  private async handleCIBuildFailed(payload: any) {
    try {
      // Get project members to notify
      if (payload.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: payload.projectId },
          include: { members: true },
        });

        if (project) {
          const userIds = project.members.map((m) => m.userId);
          await this.notificationService.createNotificationFromEvent(
            'ci.build.failed',
            {
              projectId: payload.projectId,
              projectName: project.name,
              buildName: payload.buildName,
              buildUrl: payload.buildUrl,
            },
            userIds,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error handling ci.build.failed event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleCIBuildSucceeded(payload: any) {
    try {
      // Similar to failed, but for success
      if (payload.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: payload.projectId },
          include: { members: true },
        });

        if (project) {
          const userIds = project.members.map((m) => m.userId);
          await this.notificationService.createNotificationFromEvent(
            'ci.build.succeeded',
            {
              projectId: payload.projectId,
              projectName: project.name,
              buildName: payload.buildName,
              buildUrl: payload.buildUrl,
            },
            userIds,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error handling ci.build.succeeded event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleAIWorkflowCompleted(payload: any) {
    try {
      // Notify workflow creator or project members
      const userIds: string[] = [];
      if (payload.createdBy) {
        userIds.push(payload.createdBy);
      }

      if (payload.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: payload.projectId },
          include: { members: true },
        });

        if (project) {
          project.members.forEach((m) => {
            if (m.userId && !userIds.includes(m.userId)) {
              userIds.push(m.userId);
            }
          });
        }
      }

      if (userIds.length > 0) {
        await this.notificationService.createNotificationFromEvent(
          'ai.workflow.completed',
          {
            workflowId: payload.workflowId,
            workflowName: payload.workflowName,
            projectId: payload.projectId,
            status: payload.status,
          },
          userIds,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error handling ai.workflow.completed event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
