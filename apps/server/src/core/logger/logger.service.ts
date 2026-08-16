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

    const consoleFormat = isStandalone
      ? format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          format.printf(({ timestamp, level, message, context, ...meta }) => {
            const rest =
              meta && Object.keys(meta).length
                ? ` ${JSON.stringify(meta)}`
                : '';
            return `[${level.toUpperCase()}] ${timestamp} [${context || 'App'}] ${message}${rest}`;
          }),
        )
      : format.combine(
          format.colorize(),
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          format.printf(({ timestamp, level, message, context, ...meta }) => {
            const rest =
              meta && Object.keys(meta).length
                ? ` ${JSON.stringify(meta)}`
                : '';
            return `${timestamp} [${context || 'App'}] ${level}: ${message}${rest}`;
          }),
        );

    this.logger = createLogger({
      level: this.configService.get('LOG_LEVEL') || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console({ format: consoleFormat }),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
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
   * 记录结构化日志
   */
  log(message: string, ...optionalParams: unknown[]) {
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = optionalParams.map((p) => this.sanitize(p));

    this.logger.info(message, {
      context: this.moduleContext,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录错误日志
   */
  error(message: string, trace?: string, ...optionalParams: unknown[]) {
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = optionalParams.map((p) => this.sanitize(p));

    this.logger.error(message, {
      context: this.moduleContext,
      trace,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录警告日志
   */
  warn(message: string, ...optionalParams: unknown[]) {
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = optionalParams.map((p) => this.sanitize(p));

    this.logger.warn(message, {
      context: this.moduleContext,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录调试日志
   */
  debug(message: string, ...optionalParams: unknown[]) {
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = optionalParams.map((p) => this.sanitize(p));

    this.logger.debug(message, {
      context: this.moduleContext,
      ...traceInfo,
      meta: sanitizedMeta,
    });
  }

  /**
   * 记录详细日志
   */
  verbose(message: string, ...optionalParams: unknown[]) {
    const traceInfo = this.getTraceInfo();
    const sanitizedMeta = optionalParams.map((p) => this.sanitize(p));

    this.logger.verbose(message, {
      context: this.moduleContext,
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
