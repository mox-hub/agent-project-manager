import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageBusService, DomainEvent } from './message-bus.service';
import { LoggerService } from '../logger/logger.service';

describe('MessageBusService', () => {
  let service: MessageBusService;
  let eventEmitter: EventEmitter2;

  const mockLoggerService = {
    setContext: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
    logEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageBusService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<MessageBusService>(MessageBusService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should publish domain event synchronously', () => {
      const event: DomainEvent = {
        eventId: 'evt-123',
        eventType: 'test.event',
        aggregateId: 'agg-456',
        payload: { test: 'data' },
        occurredAt: new Date(),
      };

      service.publish(event);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'test.event',
        { test: 'data' },
        expect.objectContaining({
          eventId: 'evt-123',
          eventType: 'test.event',
          aggregateId: 'agg-456',
        }),
      );
    });

    it('should enrich event with id and timestamp if missing', () => {
      const event: DomainEvent = {
        eventId: '',
        eventType: 'test.event',
        aggregateId: 'agg-456',
        payload: { test: 'data' },
        occurredAt: new Date(0),
      };

      service.publish(event);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'test.event',
        { test: 'data' },
        expect.objectContaining({
          eventType: 'test.event',
        }),
      );
    });
  });

  describe('publishSimple', () => {
    it('should publish simple event with backward compatibility', () => {
      const payload = { test: 'data' };
      service.publishSimple('test.event', payload, 'trace-123');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'test.event',
        payload,
        expect.objectContaining({
          eventType: 'test.event',
          payload,
          traceId: 'trace-123',
        }),
      );
    });
  });

  describe('publishAsync', () => {
    it('should publish event asynchronously', async () => {
      const event: DomainEvent = {
        eventId: 'evt-async',
        eventType: 'async.event',
        aggregateId: 'agg-789',
        payload: { async: true },
        occurredAt: new Date(),
      };
      (eventEmitter.emitAsync as jest.Mock).mockResolvedValue(undefined);

      await service.publishAsync(event);

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'async.event',
        { async: true },
        expect.objectContaining({
          eventId: 'evt-async',
          eventType: 'async.event',
        }),
      );
    });
  });

  describe('subscribe', () => {
    it('should subscribe to event', () => {
      const handler = jest.fn();
      const unsubscribe = service.subscribe('test.event', handler);

      expect(eventEmitter.on).toHaveBeenCalledWith(
        'test.event',
        expect.any(Function),
      );
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should call handler when event is published', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      let eventWrapper: any;

      (eventEmitter.on as jest.Mock).mockImplementation((event, wrapper) => {
        eventWrapper = wrapper;
      });

      service.subscribe('test.event', handler);

      const payload = { test: 'data' };
      const domainEvent: DomainEvent = {
        eventId: 'evt-123',
        eventType: 'test.event',
        aggregateId: 'agg-456',
        payload,
        occurredAt: new Date(),
      };

      await eventWrapper(payload, domainEvent);

      expect(handler).toHaveBeenCalledWith(payload, domainEvent);
    });

    it('should handle errors in event handler', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
      let eventWrapper: any;

      (eventEmitter.on as jest.Mock).mockImplementation((event, wrapper) => {
        eventWrapper = wrapper;
      });

      service.subscribe('test.event', handler);

      const payload = { test: 'data' };
      const domainEvent: DomainEvent = {
        eventId: 'evt-123',
        eventType: 'test.event',
        aggregateId: 'agg-456',
        payload,
        occurredAt: new Date(),
      };

      await eventWrapper(payload, domainEvent);

      expect(handler).toHaveBeenCalled();
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Error in event handler for test.event',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should unsubscribe from event', () => {
      const handler = jest.fn();
      const unsubscribe = service.subscribe('test.event', handler);

      unsubscribe();

      expect(eventEmitter.off).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear subscriptions on destroy', () => {
      const handler = jest.fn();
      service.subscribe('test.event', handler);

      service.onModuleDestroy();

      expect(service).toBeDefined();
    });
  });
});
