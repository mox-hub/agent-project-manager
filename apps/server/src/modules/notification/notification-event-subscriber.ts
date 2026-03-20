import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

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
    // Subscribe to task events
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

    // Subscribe to CI events (when Integration module publishes them)
    this.messageBus.subscribe(
      'ci.build.failed',
      this.handleCIBuildFailed.bind(this),
    );
    this.messageBus.subscribe(
      'ci.build.succeeded',
      this.handleCIBuildSucceeded.bind(this),
    );

    // Subscribe to AI workflow events
    this.messageBus.subscribe(
      'ai.workflow.completed',
      this.handleAIWorkflowCompleted.bind(this),
    );

    this.logger.log('Notification event subscriber initialized');
  }

  private async handleTaskCreated(payload: any) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: payload.taskId },
        include: {
          project: {
            include: { members: true },
          },
          assignee: true,
        },
      });

      if (!task) return;

      // Notify project members (except creator)
      const userIds = task.project.members
        .filter((m) => m.userId !== payload.createdBy)
        .map((m) => m.userId);

      if (userIds.length > 0) {
        await this.notificationService.createNotificationFromEvent(
          'task.created',
          {
            taskId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            projectName: task.project.name,
            createdBy: payload.createdBy,
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
      const task = await this.prisma.task.findUnique({
        where: { id: payload.taskId },
        include: {
          project: {
            include: { members: true },
          },
          assignee: true,
        },
      });

      if (!task) return;

      // Notify assignee if status changed
      if (payload.statusChanged && task.assigneeId) {
        await this.notificationService.createNotificationFromEvent(
          'task.statusChanged',
          {
            taskId: task.id,
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
      const task = await this.prisma.task.findUnique({
        where: { id: payload.taskId },
        include: {
          project: true,
          assignee: true,
        },
      });

      if (!task || !task.assigneeId) return;

      await this.notificationService.createNotificationFromEvent(
        'task.assigned',
        {
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
          projectName: task.project.name,
        },
        [task.assigneeId],
      );
    } catch (error) {
      this.logger.error(
        'Error handling task.assigned event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

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
            if (!userIds.includes(m.userId)) {
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
