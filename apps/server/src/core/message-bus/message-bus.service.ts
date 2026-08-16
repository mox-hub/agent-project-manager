import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { LoggerService } from '../logger/logger.service';

/**
 * 统一事件接口
 */
export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  actorType?: 'human' | 'agent' | 'system';
  actorId?: string;
  payload: T;
  occurredAt: Date;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (
  payload: T,
  event: DomainEvent<T>,
) => void | Promise<void>;

/**
 * 事件订阅取消函数
 */
export type UnsubscribeFn = () => void;

@Injectable()
export class MessageBusService implements OnModuleDestroy {
  private readonly subscriptions = new Map<string, Set<EventHandler>>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('MessageBus');
  }

  onModuleDestroy() {
    this.subscriptions.clear();
  }

  /**
   * 发布领域事件（带统一契约）
   */
  publish<T = unknown>(event: DomainEvent<T>): void;
  publish<T = unknown>(type: string, payload: T): void;
  publish<T = unknown>(
    eventOrType: DomainEvent<T> | string,
    payload?: T,
  ): void {
    // 重载实现
    if (typeof eventOrType === 'string') {
      // 旧签名兼容: publish(type, payload)
      const event: DomainEvent<T> = {
        eventId: randomUUID(),
        eventType: eventOrType,
        aggregateId: '',
        payload: payload as T,
        occurredAt: new Date(),
      };
      this.doPublish(event);
    } else {
      // 新签名: publish(domainEvent)
      this.doPublish(eventOrType);
    }
  }

  /**
   * 内部发布方法
   */
  private doPublish<T>(event: DomainEvent<T>): void {
    const enrichedEvent: DomainEvent<T> = {
      ...event,
      eventId: event.eventId || randomUUID(),
      occurredAt: event.occurredAt || new Date(),
    };

    this.logger.logEvent(enrichedEvent.eventType, {
      eventId: enrichedEvent.eventId,
      aggregateId: enrichedEvent.aggregateId,
      traceId: enrichedEvent.traceId,
    });

    this.eventEmitter.emit(
      enrichedEvent.eventType,
      enrichedEvent.payload,
      enrichedEvent,
    );
  }

  /**
   * 发布简单事件（向后兼容）
   */
  publishSimple<T = unknown>(type: string, payload: T, traceId?: string): void {
    const event: DomainEvent<T> = {
      eventId: randomUUID(),
      eventType: type,
      aggregateId: '',
      payload,
      occurredAt: new Date(),
      traceId,
    };

    this.publish(event);
  }

  /**
   * 异步发布事件
   */
  async publishAsync<T = unknown>(event: DomainEvent<T>): Promise<void> {
    const enrichedEvent: DomainEvent<T> = {
      ...event,
      eventId: event.eventId || randomUUID(),
      occurredAt: event.occurredAt || new Date(),
    };

    this.logger.logEvent(enrichedEvent.eventType, {
      eventId: enrichedEvent.eventId,
      aggregateId: enrichedEvent.aggregateId,
      traceId: enrichedEvent.traceId,
    });

    await this.eventEmitter.emitAsync(
      enrichedEvent.eventType,
      enrichedEvent.payload,
      enrichedEvent,
    );
  }

  /**
   * 订阅事件
   */
  subscribe<T = unknown>(
    type: string,
    handler: EventHandler<T>,
  ): UnsubscribeFn {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }
    this.subscriptions.get(type)!.add(handler as EventHandler);

    const wrapper = async (payload: T, event: DomainEvent<T>) => {
      try {
        await handler(payload, event);
      } catch (err) {
        this.logger.error(
          `Error in event handler for ${type}`,
          err instanceof Error ? err.stack : String(err),
          { eventId: event.eventId, traceId: event.traceId },
        );
      }
    };

    this.eventEmitter.on(type, wrapper);

    return () => {
      this.subscriptions.get(type)?.delete(handler as EventHandler);
      this.eventEmitter.off(type, wrapper);
    };
  }

  /**
   * 订阅多个事件
   */
  subscribeMany<T = unknown>(
    types: string[],
    handler: EventHandler<T>,
  ): UnsubscribeFn {
    const unsubscribers = types.map((type) => this.subscribe(type, handler));
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * 创建领域事件工厂方法
   */
  createEvent<T = unknown>(
    eventType: string,
    aggregateId: string,
    payload: T,
    options?: {
      actorType?: 'human' | 'agent' | 'system';
      actorId?: string;
      traceId?: string;
      metadata?: Record<string, unknown>;
    },
  ): DomainEvent<T> {
    return {
      eventId: randomUUID(),
      eventType,
      aggregateId,
      actorType: options?.actorType,
      actorId: options?.actorId,
      payload,
      occurredAt: new Date(),
      traceId: options?.traceId,
      metadata: options?.metadata,
    };
  }

  /**
   * 发布任务相关事件
   */
  publishTaskEvent(
    action: 'created' | 'updated' | 'assigned' | 'completed',
    taskId: string,
    projectId: string,
    actor?: { type: 'human' | 'agent'; id: string },
    metadata?: Record<string, unknown>,
  ): void {
    const event = this.createEvent(
      `task.${action}`,
      taskId,
      { taskId, projectId },
      {
        actorType: actor?.type,
        actorId: actor?.id,
        metadata,
      },
    );
    this.publish(event);
  }

  /**
   * 发布执行相关事件
   */
  publishExecutionEvent(
    action: 'created' | 'started' | 'completed' | 'failed' | 'cancelled',
    executionRunId: string,
    projectId: string,
    actor?: { type: 'human' | 'agent'; id: string },
    metadata?: Record<string, unknown>,
  ): void {
    const event = this.createEvent(
      `execution.${action}`,
      executionRunId,
      { executionRunId, projectId },
      {
        actorType: actor?.type,
        actorId: actor?.id,
        metadata,
      },
    );
    this.publish(event);
  }

  /**
   * 发布审批相关事件
   */
  publishApprovalEvent(
    action: 'requested' | 'approved' | 'rejected' | 'cancelled',
    approvalRequestId: string,
    projectId: string,
    actor?: { type: 'human' | 'agent' | 'system'; id: string },
    metadata?: Record<string, unknown>,
  ): void {
    const event = this.createEvent(
      `approval.${action}`,
      approvalRequestId,
      { approvalRequestId, projectId },
      {
        actorType: actor?.type,
        actorId: actor?.id,
        metadata,
      },
    );
    this.publish(event);
  }

  /**
   * 发布Runtime相关事件
   */
  publishRuntimeEvent(
    action:
      | 'connected'
      | 'disconnected'
      | 'heartbeat'
      | 'execution.started'
      | 'execution.completed',
    runtimeId: string,
    actor?: { type: 'system' | 'agent'; id: string },
    metadata?: Record<string, unknown>,
  ): void {
    const event = this.createEvent(
      `runtime.${action}`,
      runtimeId,
      { runtimeId },
      {
        actorType: actor?.type,
        actorId: actor?.id,
        metadata,
      },
    );
    this.publish(event);
  }
}
