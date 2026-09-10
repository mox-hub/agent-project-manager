import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';
import { ConfigService } from '../config/config.service';
import { TraceContextService } from '../tracing/trace-context.service';

/**
 * 敏感信息正则表达式
 */
const SENSITIVE_PATTERNS = [
  {
    pattern: /password["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    replacement: 'password=***',
  },
  {
    pattern:
      /token["']?\s*[:=]\s*["']?[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+["']?/gi,
    replacement: 'token=***',
  },
  {
    pattern: /Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gi,
    replacement: 'Bearer ***',
  },
  {
    pattern: /api[_-]?key["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    replacement: 'api_key=***',
  },
  {
    pattern: /secret["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    replacement: 'secret=***',
  },
  {
    pattern: /credential["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi,
    replacement: 'credential=***',
  },
];

/**
 * 控制台彩色输出：level 按严重度着色、context 统一亮青色便于扫读。
 * 默认开启——pnpm/turbo 会接管子进程 stdout（isTTY=false），但终端仍能渲染 ANSI；
 * NO_COLOR=1 关闭，FORCE_COLOR=0 显式关闭（管道捕获/机器可读场景），FORCE_COLOR=1 强制开启
 */
const ANSI_RESET = '\x1b[0m';
const LEVEL_ANSI: Record<string, string> = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[32m', // green
  http: '\x1b[36m', // cyan
  verbose: '\x1b[35m', // magenta
  debug: '\x1b[90m', // gray
};
const CONTEXT_ANSI = '\x1b[96m'; // bright cyan

export function consoleColorEnabled(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === '0') return false;
  if (process.env.FORCE_COLOR) return true;
  return true;
}

/**
 * 控制台行渲染（纯函数，便于单测）：
 * standalone：[LEVEL] timestamp [CONTEXT] message
 * 常规：      timestamp [CONTEXT] level: message
 */
export function formatConsoleLine(input: {
  standalone: boolean;
  color: boolean;
  timestamp: string;
  level: string;
  context?: string;
  message: string;
  rest: string;
}): string {
  const levelTag = input.standalone
    ? `[${input.level.toUpperCase()}]`
    : `${input.level}:`;
  const contextTag = `[${input.context || 'APM'}]`;
  if (!input.color) {
    return input.standalone
      ? `${levelTag} ${input.timestamp} ${contextTag} ${input.message}${input.rest}`
      : `${input.timestamp} ${contextTag} ${levelTag} ${input.message}${input.rest}`;
  }
  const levelColor = LEVEL_ANSI[input.level] ?? '';
  const paintedLevel = levelColor
    ? `${levelColor}${levelTag}${ANSI_RESET}`
    : levelTag;
  const paintedContext = `${CONTEXT_ANSI}${contextTag}${ANSI_RESET}`;
  return input.standalone
    ? `${paintedLevel} ${input.timestamp} ${paintedContext} ${input.message}${input.rest}`
    : `${input.timestamp} ${paintedContext} ${paintedLevel} ${input.message}${input.rest}`;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  message: string;
  level: string;
  timestamp: string;
  context?: string;
  module?: string;
  traceId?: string;
  spanId?: string;
  executionRunId?: string;
  actorType?: string;
  actorId?: string;
  [key: string]: unknown;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;
  private moduleContext?: string;
  private executionRunId?: string;
  private actorInfo?: { type: string; id: string };

  constructor(
    private readonly configService: ConfigService,
    private readonly traceContext?: TraceContextService,
  ) {
    const isStandalone = process.env.APP_MODE === 'standalone';

    const consoleFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.printf(({ timestamp, level, message, context, ...meta }) => {
        const rest =
          meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return formatConsoleLine({
          standalone: isStandalone,
          color: consoleColorEnabled(),
          // winston 的 TransformableInfo 索引签名把这几个值标为 unknown，
          // 实际经 timestamp/colorize 管道后均为字符串
          timestamp: timestamp as string,
          level: level as string,
          context: context as string | undefined,
          message: message as string,
          rest,
        });
      }),
    );

    this.logger = createLogger({
      // 底层放宽到 debug：combined.log 收全量（含高频事件降噪行）；
      // 控制台固定 info（不被 .env 的 LOG_LEVEL=debug 拉高刷屏），
      // 需要 console 调试输出时设 CONSOLE_LOG_LEVEL=debug
      level: 'debug',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console({
          level: this.configService.get('CONSOLE_LOG_LEVEL') || 'info',
          format: consoleFormat,
        }),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log', level: 'debug' }),
      ],
    });
  }

  /**
   * 设置模块上下文
   */
  setContext(context: string): void {
    this.moduleContext = context;
  }

  /**
   * 设置模块名称（简洁版本）
   */
  setModule(moduleName: string): void {
    this.moduleContext = moduleName;
  }

  /**
   * 绑定执行实例ID
   */
  setExecution(executionRunId: string): void {
    this.executionRunId = executionRunId;
  }

  /**
   * 设置Actor信息
   */
  setActor(actorType: 'human' | 'agent' | 'system', actorId: string): void {
    this.actorInfo = { type: actorType, id: actorId };
  }

  /**
   * 获取追踪信息
   */
  private getTraceInfo(): Record<string, string | undefined> {
    const trace = this.traceContext?.getContext();
    return {
      traceId: trace?.traceId,
      spanId: trace?.spanId,
      executionRunId: this.executionRunId || trace?.executionRunId,
      actorType: this.actorInfo?.type || trace?.actorType,
      actorId: this.actorInfo?.id || trace?.actorId,
    };
  }

  /**
   * 脱敏处理
   */
  sanitize(data: unknown): unknown {
    if (typeof data === 'string') {
      let sanitized = data;
      for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
      }
      return sanitized;
    }

    if (typeof data === 'object' && data !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        // 跳过敏感字段名
        if (
          ['password', 'token', 'secret', 'credential', 'apiKey'].some((s) =>
            key.toLowerCase().includes(s),
          )
        ) {
          result[key] = '***';
        } else if (typeof value === 'string') {
          result[key] = this.sanitize(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return data;
  }

  /**
   * 解析本次调用的日志上下文：Nest Logger 实例会把自身 context 追加为
   * 最后一个参数（error 在 trace 之后），调用方有传入则优先采用；
   * 未传入时回退到共享实例上的模块级上下文
   */
  private resolveContext(optionalParams: unknown[]): {
    context?: string;
    rest: unknown[];
  } {
    const last = optionalParams[optionalParams.length - 1];
    if (typeof last === 'string') {
      return { context: last, rest: optionalParams.slice(0, -1) };
    }
    return { context: this.moduleContext, rest: optionalParams };
  }

  /**
   * 记录结构化日志
   */
  log(message: string, ...optionalParams: unknown[]) {
    const { context, rest } = this.resolveContext(optionalParams);
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = rest.map((p) => this.sanitize(p));

    this.logger.info(message, {
      context,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录错误日志
   */
  error(message: string, trace?: string, ...optionalParams: unknown[]) {
    const { context, rest } = this.resolveContext(optionalParams);
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = rest.map((p) => this.sanitize(p));

    this.logger.error(message, {
      context,
      trace,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录警告日志
   */
  warn(message: string, ...optionalParams: unknown[]) {
    const { context, rest } = this.resolveContext(optionalParams);
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = rest.map((p) => this.sanitize(p));

    this.logger.warn(message, {
      context,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录调试日志
   */
  debug(message: string, ...optionalParams: unknown[]) {
    const { context, rest } = this.resolveContext(optionalParams);
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = rest.map((p) => this.sanitize(p));

    this.logger.debug(message, {
      context,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录详细日志
   */
  verbose(message: string, ...optionalParams: unknown[]) {
    const { context, rest } = this.resolveContext(optionalParams);
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = rest.map((p) => this.sanitize(p));

    this.logger.verbose(message, {
      context,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录执行日志（快捷方法）
   */
  logExecution(action: string, meta: Record<string, unknown>): void {
    const traceInfo = this.getTraceInfo();
    const sanitized = this.sanitize(meta) as Record<string, unknown>;
    this.logger.info(`[EXECUTION] ${action}`, {
      context: this.moduleContext,
      ...traceInfo,
      action,
      ...sanitized,
    });
  }

  /**
   * 记录事件日志（快捷方法）
   */
  logEvent(eventType: string, payload: Record<string, unknown>): void {
    const traceInfo = this.getTraceInfo();
    const sanitized = this.sanitize(payload) as Record<string, unknown>;
    this.logger.info(`[EVENT] ${eventType}`, {
      context: this.moduleContext,
      ...traceInfo,
      eventType,
      ...sanitized,
    });
  }

  /**
   * 记录审计日志（快捷方法）
   */
  logAudit(action: string, resource: Record<string, unknown>): void {
    const traceInfo = this.getTraceInfo();
    const sanitized = this.sanitize(resource) as Record<string, unknown>;
    this.logger.info(`[AUDIT] ${action}`, {
      context: this.moduleContext || 'Audit',
      ...traceInfo,
      action,
      ...sanitized,
    });
  }

  /**
   * JSON格式输出（用于结构化日志）
   */
  toJSON(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      context: this.moduleContext,
      ...this.getTraceInfo(),
    });
  }
}
