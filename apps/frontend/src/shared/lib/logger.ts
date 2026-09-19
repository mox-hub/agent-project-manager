type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
}

function argsToString(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

const originalConsole = {
  trace: console.trace.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  groupCollapsed: console.groupCollapsed?.bind(console),
  groupEnd: console.groupEnd?.bind(console),
};

const levelToConsoleKey: Record<LogLevel, 'trace' | 'debug' | 'info' | 'warn' | 'error'> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

class Logger {
  private prefix?: string;

  constructor(options?: LoggerOptions) {
    this.prefix = options?.prefix;
  }

  private emit(level: LogLevel, ...args: unknown[]): void {
    const tag = this.prefix ? `[${this.prefix}]` : '';
    const consoleFn = originalConsole[levelToConsoleKey[level]];

    if (tag) {
      consoleFn(tag, ...args);
    } else {
      consoleFn(...args);
    }
  }

  trace(...args: unknown[]) {
    this.emit('trace', ...args);
  }

  debug(...args: unknown[]) {
    this.emit('debug', ...args);
  }

  info(...args: unknown[]) {
    this.emit('info', ...args);
  }

  warn(...args: unknown[]) {
    this.emit('warn', ...args);
  }

  error(...args: unknown[]) {
    this.emit('error', ...args);
  }

  /**
   * API call logger.
   * Emits a structured log entry with method/url/status/duration/body.
   * In dev mode the body is printed inside a collapsed group for readability.
   */
  api(
    method: string,
    url: string,
    status: number,
    durationMs: number,
    body?: unknown,
  ): void {
    const tag = this.prefix ? `[${this.prefix}]` : '[API]';
    const ok = status >= 200 && status < 300;
    const symbol = ok ? '✓' : '✗';
    const header = `${tag} ${symbol} ${method} ${url} ${status} ${durationMs}ms`;

    const consoleFn = ok ? originalConsole.debug : originalConsole.error;

    const hasGroup =
      typeof originalConsole.groupCollapsed === 'function' &&
      typeof originalConsole.groupEnd === 'function';

    if (hasGroup && originalConsole.groupCollapsed && originalConsole.groupEnd) {
      originalConsole.groupCollapsed(header);
      try {
        originalConsole.log('body:', body);
      } catch {
        originalConsole.log('body: <unserializable>');
      }
      originalConsole.groupEnd();
    } else {
      consoleFn(header, 'body:', body);
    }
  }

  child(options?: LoggerOptions): Logger {
    const childPrefix = [this.prefix, options?.prefix].filter(Boolean).join(':');
    return new Logger({ prefix: childPrefix });
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '<unserializable>';
  }
}

const rootLogger = new Logger();

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}

export const logger = rootLogger;
