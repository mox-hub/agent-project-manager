import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { DomainEventTypes } from '../../core/message-bus/domain-events';
import { MentionService } from './mention.service';
import { PrismaService } from '../../core/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

/**
 * @提及解析枢纽：监听任务描述变更与评论事件，服务端统一解析 @handle。
 *
 * 为什么放订阅器而非 issue/activity 服务内直接调用：MentionService 在
 * TeamModule（其依赖链 CliDispatch → Issue 与 ActivityModule/Global 存在
 * 模块环），事件驱动让 mention 解析与业务写路径彻底解耦，业务服务零感知。
 *
 * 幂等性由 MentionService.parseAndCreate 保证（同源同成员只提醒一次）。
 */
@Injectable()
export class MentionEventSubscriber implements OnModuleInit {
  constructor(
    private readonly messageBus: MessageBusService,
    private readonly mentionService: MentionService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('MentionEventSubscriber');
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
    this.logger.log('Mention event subscriber initialized');
  }

  /** 任务描述变更 → 解析描述里的 @handle */
  private async handleTaskUpdated(payload: any) {
    try {
      const changedFields: string[] = Array.isArray(payload.changedFields)
        ? payload.changedFields
        : [];
      if (!changedFields.includes('description')) return;
      const description = payload.task?.description;
      if (!description) return;
      await this.mentionService.parseAndCreate(
        { text: description, sourceType: 'task', sourceId: payload.issueId },
        payload.userId,
      );
    } catch (error) {
      this.logger.error(
        'Error handling task.updated for mentions',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** 评论 → 解析评论全文里的 @handle */
  private async handleTaskCommented(payload: any) {
    try {
      const content = payload.content ?? payload.excerpt;
      if (!content) return;
      await this.mentionService.parseAndCreate(
        {
          text: String(content),
          sourceType: String(payload.entityType ?? 'task'),
          sourceId: String(payload.entityId),
        },
        payload.actorId,
      );
    } catch (error) {
      this.logger.error(
        'Error handling task.commented for mentions',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
