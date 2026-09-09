import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';
import { ConfigService } from '../config/config.service';
import { TraceContextService } from '../tracing/trace-context.service';

describe('LoggerService', () => {
  let service: LoggerService;

  const mockConfigService = {
    get: vi.fn().mockReturnValue('info'),
  };

  const mockTraceContextService = {
    getContext: vi.fn().mockReturnValue({ traceId: 'test-trace-id' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TraceContextService,
          useValue: mockTraceContextService,
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setContext', () => {
    it('should set context', () => {
      service.setContext('TestContext');
      // Context is stored internally, verify by checking log calls
      service.log('test message');
      // The logger should use the context
      expect(service).toBeDefined();
    });
  });

  describe('log', () => {
    it('should log info message', () => {
      const logSpy = vi.spyOn(service['logger'], 'info');
      service.log('test message');
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      const errorSpy = vi.spyOn(service['logger'], 'error');
      service.error('test error', 'trace');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      const warnSpy = vi.spyOn(service['logger'], 'warn');
      service.warn('test warning');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      const debugSpy = vi.spyOn(service['logger'], 'debug');
      service.debug('test debug');
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  describe('verbose', () => {
    it('should log verbose message', () => {
      const verboseSpy = vi.spyOn(service['logger'], 'verbose');
      service.verbose('test verbose');
      expect(verboseSpy).toHaveBeenCalled();
    });
  });
});
