import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

type MockLogger = {
  log: jest.Mock;
  debug: jest.Mock;
  error: jest.Mock;
  setContext: jest.Mock;
};

function buildLogger(): MockLogger {
  return {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    setContext: jest.fn(),
  };
}

function runInterceptor(
  logger: MockLogger,
  url: string,
  responseData: unknown,
) {
  const interceptor = new LoggingInterceptor(logger as never);
  const request = {
    method: 'GET',
    url,
    ip: '127.0.0.1',
    query: { limit: '50' },
    get: () => 'jest-agent',
  };
  const response = { statusCode: 200 };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  interceptor
    .intercept(context, { handle: () => of(responseData) } as never)
    .subscribe();
}

describe('LoggingInterceptor', () => {
  it('should be defined', () => {
    const interceptor = new LoggingInterceptor(buildLogger() as never);
    expect(interceptor).toBeDefined();
  });

  describe('静默路径降噪', () => {
    it('轮询端点（/_api/runtime/dispatches）请求/响应日志降为 debug，不打 info', () => {
      const logger = buildLogger();
      runInterceptor(logger, '/_api/runtime/dispatches?limit=50', { data: [] });

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.log).not.toHaveBeenCalled();
    });

    it('前缀匹配覆盖子路径（dispatches/summary 轻端点同样降噪）', () => {
      const logger = buildLogger();
      runInterceptor(logger, '/_api/runtime/dispatches/summary', {
        data: { active: false, pending: 0, running: 0 },
      });

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.log).not.toHaveBeenCalled();
    });

    it('LOG_QUIET_PATHS 可追加静默前缀（运行时读取，改动即时生效）', () => {
      process.env.LOG_QUIET_PATHS = '/_api/decisions/summary';
      try {
        const logger = buildLogger();
        runInterceptor(logger, '/_api/decisions/summary?projectId=p1', {
          data: {},
        });

        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(logger.log).not.toHaveBeenCalled();
      } finally {
        delete process.env.LOG_QUIET_PATHS;
      }
    });

    it('非静默路径保持 info 级别', () => {
      const logger = buildLogger();
      runInterceptor(logger, '/_api/issues', { data: [] });

      expect(logger.log).toHaveBeenCalledTimes(2);
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('sample 收紧', () => {
    it('list 形状 sample 中长字符串截断到 120 字符', () => {
      const logger = buildLogger();
      const longPrompt = 'x'.repeat(500);
      runInterceptor(logger, '/_api/issues', {
        data: [{ prompt: longPrompt }],
      });

      const responseCall = logger.log.mock.calls[1] as [
        string,
        { sample: Array<{ prompt: string }> },
      ];
      expect(responseCall[1].sample[0].prompt).toBe(`${'x'.repeat(120)}…`);
    });

    it('page 形状 sample 同样收紧', () => {
      const logger = buildLogger();
      const longText = 'y'.repeat(300);
      runInterceptor(logger, '/_api/issues/page', {
        items: [{ title: longText }],
        total: 1,
      });

      const responseCall = logger.log.mock.calls[1] as [
        string,
        { sample: Array<{ title: string }> },
      ];
      expect(responseCall[1].sample[0].title).toBe(`${'y'.repeat(120)}…`);
    });

    it('sample 中的敏感键仍脱敏', () => {
      const logger = buildLogger();
      runInterceptor(logger, '/_api/issues', {
        data: [{ token: 'secret-value', name: 'issue-1' }],
      });

      const responseCall = logger.log.mock.calls[1] as [
        string,
        { sample: Array<Record<string, string>> },
      ];
      expect(responseCall[1].sample[0].token).toBe('***');
      expect(responseCall[1].sample[0].name).toBe('issue-1');
    });
  });

  describe('错误路径', () => {
    it('静默路径出错仍用 error 级别（不降级吞掉故障）', () => {
      const logger = buildLogger();
      const interceptor = new LoggingInterceptor(logger as never);
      const request = {
        method: 'GET',
        url: '/_api/runtime/dispatches?limit=50',
        ip: '127.0.0.1',
        query: { limit: '50' },
        get: () => 'jest-agent',
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ statusCode: 200 }),
        }),
      } as unknown as ExecutionContext;

      interceptor
        .intercept(context, {
          handle: () => throwError(() => new Error('boom')),
        } as never)
        .subscribe({
          error: () => undefined,
        });

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.log).not.toHaveBeenCalled();
    });
  });
});
