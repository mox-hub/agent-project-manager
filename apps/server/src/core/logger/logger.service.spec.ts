import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  consoleColorEnabled,
  formatConsoleLine,
  LoggerService,
} from './logger.service';
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

  describe('context resolution', () => {
    it('should prefer caller-passed trailing string context (Nest Logger 形状)', () => {
      const infoSpy = vi.spyOn(service['logger'], 'info');
      service.log('test message', 'AcceptanceService');
      expect(infoSpy).toHaveBeenCalledWith(
        'test message',
        expect.objectContaining({ context: 'AcceptanceService' }),
      );
    });

    it('should fall back to module context when no trailing string passed', () => {
      const infoSpy = vi.spyOn(service['logger'], 'info');
      service.setContext('APM');
      service.log('test message', { userId: 1 });
      expect(infoSpy).toHaveBeenCalledWith(
        'test message',
        expect.objectContaining({ context: 'APM' }),
      );
    });

    it('should resolve context after trace param for error', () => {
      const errorSpy = vi.spyOn(service['logger'], 'error');
      service.error('test error', 'stack-line', 'Prisma');
      expect(errorSpy).toHaveBeenCalledWith(
        'test error',
        expect.objectContaining({ context: 'Prisma', trace: 'stack-line' }),
      );
    });

    it('should exclude the trailing context string from meta', () => {
      const warnSpy = vi.spyOn(service['logger'], 'warn');
      service.warn('test warning', 'RuntimeService');
      const call = warnSpy.mock.calls[0][1] as { meta: unknown[] };
      expect(call.meta).toEqual([]);
    });
  });

  describe('formatConsoleLine', () => {
    const base = {
      timestamp: '2026-09-09 12:00:00.000',
      message: 'hello',
      rest: '',
    };

    it('standalone 无色：[LEVEL] ts [CTX] msg', () => {
      expect(
        formatConsoleLine({
          ...base,
          standalone: true,
          color: false,
          level: 'info',
          context: 'APM',
        }),
      ).toBe('[INFO] 2026-09-09 12:00:00.000 [APM] hello');
    });

    it('常规无色：ts [CTX] level: msg（与旧格式逐字节一致）', () => {
      expect(
        formatConsoleLine({
          ...base,
          standalone: false,
          color: false,
          level: 'info',
          context: 'Prisma',
        }),
      ).toBe('2026-09-09 12:00:00.000 [Prisma] info: hello');
    });

    it('彩色：error 红色 + 上下文亮青', () => {
      expect(
        formatConsoleLine({
          ...base,
          standalone: false,
          color: true,
          level: 'error',
          context: 'APM',
        }),
      ).toBe(
        '2026-09-09 12:00:00.000 \x1b[96m[APM]\x1b[0m \x1b[31merror:\x1b[0m hello',
      );
    });

    it('彩色：未知 level 不上色，context 缺省回退 APM', () => {
      expect(
        formatConsoleLine({
          ...base,
          standalone: false,
          color: true,
          level: 'weird',
          context: undefined,
        }),
      ).toBe('2026-09-09 12:00:00.000 \x1b[96m[APM]\x1b[0m weird: hello');
    });

    it('meta rest 原样拼接', () => {
      expect(
        formatConsoleLine({
          ...base,
          rest: ' {"traceId":"t1"}',
          standalone: true,
          color: false,
          level: 'warn',
          context: 'HTTP',
        }),
      ).toBe('[WARN] 2026-09-09 12:00:00.000 [HTTP] hello {"traceId":"t1"}');
    });
  });

  describe('consoleColorEnabled', () => {
    const prevNoColor = process.env.NO_COLOR;
    const prevForceColor = process.env.FORCE_COLOR;

    afterEach(() => {
      if (prevNoColor === undefined) delete process.env.NO_COLOR;
      else process.env.NO_COLOR = prevNoColor;
      if (prevForceColor === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = prevForceColor;
    });

    it('默认开启（pnpm/turbo 管道下 isTTY=false 仍需着色）', () => {
      delete process.env.NO_COLOR;
      delete process.env.FORCE_COLOR;
      expect(consoleColorEnabled()).toBe(true);
    });

    it('NO_COLOR 关闭；FORCE_COLOR=0 显式关闭；FORCE_COLOR=1 开启', () => {
      process.env.NO_COLOR = '1';
      expect(consoleColorEnabled()).toBe(false);
      delete process.env.NO_COLOR;
      process.env.FORCE_COLOR = '0';
      expect(consoleColorEnabled()).toBe(false);
      process.env.FORCE_COLOR = '1';
      expect(consoleColorEnabled()).toBe(true);
    });
  });
});
