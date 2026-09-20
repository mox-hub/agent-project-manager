import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventTypes } from '@/core/message-bus/domain-events';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { classifyExecutionFailure } from '../execution/failure-classifier';

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
      DomainEventTypes.TaskCreated,
      this.handleTaskCreated.bind(this),
    );
    this.messageBus.subscribe(
      DomainEventTypes.TaskUpdated,
      this.handleTaskUpdated.bind(this),
    );
    this.messageBus.subscribe(
      DomainEventTypes.TaskAssigned,
      this.handleTaskAssigned.bind(this),
    );
    this.messageBus.subscribe(
      DomainEventTypes.TaskDeleted,
      this.handleTaskDeleted.bind(this),
    );

    // Document 事件（document.service 发布）
    this.messageBus.subscribe(
      DomainEventTypes.DocumentCreated,
      this.handleDocumentCreated.bind(this),
    );
    this.messageBus.subscribe(
      DomainEventTypes.DocumentDeleted,
      this.handleDocumentDeleted.bind(this),
    );

    // Project 事件
    this.messageBus.subscribe(
      DomainEventTypes.ProjectCreated,
      this.handleProjectCreated.bind(this),
    );
    this.messageBus.subscribe(
      DomainEventTypes.ProjectArchived,
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

    // 决策提案（proposal.service.create 发布，P0-12：此前从未订阅 →
    // 决策收件箱有卡但 0 通知，用户不知道「AI 已把建议放进收件箱」）
    this.messageBus.subscribe(
      'decision.proposal.created',
      this.handleDecisionProposalCreated.bind(this),
    );

    // 执行状态变更（失败感知：failed/blocked 定向通知发起人与负责人）
    this.messageBus.subscribe(
      DomainEventTypes.ExecutionRunUpdated,
      this.handleExecutionRunUpdated.bind(this),
    );

    // 审批请求（执行事实性暂停，等待人工裁决）
    this.messageBus.subscribe(
      DomainEventTypes.ApprovalRequested,
      this.handleApprovalRequested.bind(this),
    );

    // 提及事件（mention.service.parseAndCreate 发布，直发被 @ 用户）
    this.messageBus.subscribe(
      DomainEventTypes.MentionCreated,
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
          DomainEventTypes.TaskCreated,
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
          DomainEventTypes.TaskStatusChanged,
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
        DomainEventTypes.TaskAssigned,
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
        DomainEventTypes.TaskDeleted,
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
        DomainEventTypes.DocumentCreated,
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
        DomainEventTypes.DocumentDeleted,
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
        DomainEventTypes.ProjectCreated,
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
        DomainEventTypes.ProjectArchived,
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
        DomainEventTypes.MentionCreated,
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

  // ─── 执行失败感知 / 审批挂起（兜底改造批 1，2026-09-15 裁决）───

  /**
   * 执行事件通知受众：默认执行发起人（createdBy）+ 工单负责人（human），
   * 去重；排除已订阅 task/project 的用户——订阅枢纽（subscription-event
   * subscriber）已向订阅者发 execution.terminal，避免同人双条。
   * 受众模式可用环境变量 NOTIFY_EXECUTION_AUDIENCE 覆盖：
   * party（默认，发起人+负责人）| project（项目全员）。
   */
  private async resolveExecutionAudience(
    projectId: string,
    issueId: string | null,
    createdBy: string | null,
  ): Promise<string[]> {
    const mode = process.env.NOTIFY_EXECUTION_AUDIENCE ?? 'party';

    let userIds: string[];
    if (mode === 'project') {
      userIds = await this.projectMemberIds(projectId);
    } else {
      const ids = new Set<string>();
      if (createdBy) ids.add(createdBy);
      if (issueId) {
        // Issue.assignee 是 User 关系（assigneeId → User.id），即通知 userId 口径
        const issue = await this.prisma.issue.findUnique({
          where: { id: issueId },
          select: { assignee: { select: { id: true } } },
        });
        if (issue?.assignee?.id) ids.add(issue.assignee.id);
      }
      userIds = [...ids];
    }

    // 排除订阅链路已覆盖的用户
    const scopes = [
      ...(issueId ? [{ entityType: 'task', entityId: issueId }] : []),
      { entityType: 'project', entityId: projectId },
    ];
    const subs = await this.prisma.subscription.findMany({
      where: { OR: scopes },
      select: { memberId: true },
    });
    if (subs.length > 0) {
      const memberIds = [...new Set(subs.map((s) => s.memberId))];
      const members = await this.prisma.member.findMany({
        where: { id: { in: memberIds }, userId: { not: null } },
        select: { userId: true },
      });
      const subscribed = new Set(
        members.map((m) => m.userId as string).filter(Boolean),
      );
      userIds = userIds.filter((id) => !subscribed.has(id));
    }
    return userIds;
  }

  private async handleExecutionRunUpdated(payload: any) {
    try {
      const status = String(payload.newStatus ?? '');
      // 仅失败类终态需要主动唤醒；completed 由订阅枢纽按订阅关系通知
      if (!['failed', 'blocked'].includes(status)) return;

      const run = await this.prisma.execution.findUnique({
        where: { id: payload.executionRunId },
        select: {
          id: true,
          goal: true,
          projectId: true,
          issueId: true,
          createdBy: true,
          // 失败诊断·机械归类素材（裁决 D 零 token 半）：错误留痕随通知直达
          errorDetail: true,
          input: true,
        },
      });
      if (!run) return;

      const userIds = await this.resolveExecutionAudience(
        run.projectId,
        run.issueId,
        run.createdBy,
      );
      if (userIds.length === 0) return;

      const classification = classifyExecutionFailure(run);

      await this.notificationService.createNotificationFromEvent(
        DomainEventTypes.ExecutionTerminal,
        {
          executionRunId: run.id,
          goal: run.goal,
          status,
          projectId: run.projectId,
          issueId: run.issueId,
          failureCategory: classification?.category,
          failureHint: classification?.hint,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling execution.run.updated event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleApprovalRequested(payload: any) {
    try {
      const run = await this.prisma.execution.findUnique({
        where: { id: payload.executionRunId },
        select: {
          id: true,
          goal: true,
          projectId: true,
          issueId: true,
          createdBy: true,
        },
      });
      if (!run) return;

      const userIds = await this.resolveExecutionAudience(
        run.projectId,
        run.issueId,
        run.createdBy,
      );
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        DomainEventTypes.ApprovalRequested,
        {
          approvalRequestId: payload.approvalRequestId,
          executionRunId: run.id,
          goal: run.goal,
          requestedAction: payload.requestedAction,
          riskLevel: payload.riskLevel,
          projectId: run.projectId,
          issueId: run.issueId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling approval.requested event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─── 决策提案（P0-12 通知管道收口）──────────────────────

  /**
   * decision.proposal.created（proposal.service.create 发布）→
   * 通知提案所属项目成员（排除提案人）。事件 payload 不含操作者字段，
   * 提案人从提案行补读（proposerId 为 userId 时排除生效；AI 成员 id
   * 不在项目成员 userId 集合内，天然不影响受众）。无 projectId 的提案
   * 最小版不通知（后续可扩展工作区级广播）。
   */
  private async handleDecisionProposalCreated(payload: any) {
    try {
      const proposal = await this.prisma.decisionProposal.findUnique({
        where: { id: payload.proposalId },
      });
      if (!proposal || !proposal.projectId) return;

      const project = await this.prisma.project.findUnique({
        where: { id: proposal.projectId },
        include: { members: true },
      });
      if (!project) return;

      const userIds = [
        ...new Set(
          project.members
            .map((m) => m.userId)
            .filter(
              (id): id is string =>
                !!id && id !== (proposal.proposerId ?? undefined),
            ),
        ),
      ];
      if (userIds.length === 0) return;

      await this.notificationService.createNotificationFromEvent(
        'decision.proposal.created',
        {
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          kind: proposal.kind,
          projectId: proposal.projectId,
          projectName: project.name,
          issueId: proposal.issueId,
        },
        userIds,
      );
    } catch (error) {
      this.logger.error(
        'Error handling decision.proposal.created event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
