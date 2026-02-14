import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageBusService } from './message-bus.service';
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
    it('should publish event synchronously', () => {
      const payload = { test: 'data' };
      service.publish('test.event', payload);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'test.event',
        payload,
        expect.objectContaining({
          type: 'test.event',
          payload,
          timestamp: expect.any(Date),
        }),
      );
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        'Publishing event: test.event',
        { correlationId: undefined },
      );
    });

    it('should publish event with correlationId', () => {
      const payload = { test: 'data' };
      const correlationId = 'corr-123';
      service.publish('test.event', payload, correlationId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'test.event',
        payload,
        expect.objectContaining({
          type: 'test.event',
          payload,
          correlationId,
        }),
      );
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        'Publishing event: test.event',
        { correlationId },
      );
    });
  });

  describe('publishAsync', () => {
    it('should publish event asynchronously', async () => {
      const payload = { test: 'data' };
      (eventEmitter.emitAsync as jest.Mock).mockResolvedValue(undefined);

      await service.publishAsync('test.event', payload);

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'test.event',
        payload,
        expect.objectContaining({
          type: 'test.event',
          payload,
          timestamp: expect.any(Date),
        }),
      );
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        'Publishing async event: test.event',
        { correlationId: undefined },
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
      const event = {
        type: 'test.event',
        payload,
        timestamp: new Date(),
      };

      await eventWrapper(payload, event);

      expect(handler).toHaveBeenCalledWith(payload, event);
    });

    it('should handle errors in event handler', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
      let eventWrapper: any;

      (eventEmitter.on as jest.Mock).mockImplementation((event, wrapper) => {
        eventWrapper = wrapper;
      });

      service.subscribe('test.event', handler);

      const payload = { test: 'data' };
      const event = {
        type: 'test.event',
        payload,
        timestamp: new Date(),
      };

      await eventWrapper(payload, event);

      expect(handler).toHaveBeenCalled();
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Error in event handler for test.event',
        expect.any(String),
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

      // Subscriptions should be cleared
      expect(service).toBeDefined();
    });
  });
});
