import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../logger/logger.service';
import { EventHandler, MessageBusEvent } from './message-bus.types';

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

  publish<T = unknown>(type: string, payload: T, correlationId?: string) {
    const event: MessageBusEvent<T> = {
      type,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    this.logger.debug(`Publishing event: ${type}`, { correlationId });
    this.eventEmitter.emit(type, payload, event);
  }

  async publishAsync<T = unknown>(
    type: string,
    payload: T,
    correlationId?: string,
  ) {
    const event: MessageBusEvent<T> = {
      type,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    this.logger.debug(`Publishing async event: ${type}`, { correlationId });
    await this.eventEmitter.emitAsync(type, payload, event);
  }

  subscribe<T = unknown>(type: string, handler: EventHandler<T>): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }
    this.subscriptions.get(type)!.add(handler as EventHandler);

    const wrapper = async (payload: T, event: MessageBusEvent<T>) => {
      try {
        await handler(payload, event);
      } catch (err) {
        this.logger.error(
          `Error in event handler for ${type}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    };

    this.eventEmitter.on(type, wrapper);

    return () => {
      this.subscriptions.get(type)?.delete(handler as EventHandler);
      this.eventEmitter.off(type, wrapper);
    };
  }
}
