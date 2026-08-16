import { Injectable, NestMiddleware, MiddlewareConsumer } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * 追踪上下文接口
 */
export interface TraceContext {
  traceId: string;
  spanId?: string;
  parentId?: string;
  executionRunId?: string;
  actorType?: 'human' | 'agent' | 'system';
  actorId?: string;
  requestId?: string;
  timestamp: Date;
}

/**
 * 请求级别的追踪上下文存储
 */
const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * TraceContext 服务
 * 管理全链路追踪上下文，支持HTTP请求和ExecutionRun级别的追踪
 */
@Injectable()
export class TraceContextService {
  static readonly TRACE_ID_HEADER = 'x-trace-id';
  static readonly SPAN_ID_PREFIX = 'span-';

  /**
   * 获取当前追踪上下文
   */
  getContext(): TraceContext | undefined {
    return traceStorage.getStore();
  }

  /**
   * 获取当前traceId
   */
  getTraceId(): string | undefined {
    return this.getContext()?.traceId;
  }

  /**
   * 获取当前spanId
   */
  getSpanId(): string | undefined {
    return this.getContext()?.spanId;
  }

  /**
   * 获取executionRunId
   */
  getExecutionRunId(): string | undefined {
    return this.getContext()?.executionRunId;
  }

  /**
   * 创建新的span
   */
  createSpan(parentContext?: TraceContext): TraceContext {
    const baseContext = parentContext || this.getContext();
    const traceId = baseContext?.traceId || randomUUID();
    const spanId = `${TraceContextService.SPAN_ID_PREFIX}${randomUUID().slice(0, 8)}`;

    return {
      traceId,
      spanId,
      parentId: baseContext?.spanId,
      executionRunId: baseContext?.executionRunId,
      actorType: baseContext?.actorType,
      actorId: baseContext?.actorId,
      timestamp: new Date(),
    };
  }

  /**
   * 绑定executionRun
   */
  bindExecutionRun(executionRunId: string): TraceContext {
    const current = this.getContext();
    const traceId = current?.traceId || randomUUID();
    const spanId = `${TraceContextService.SPAN_ID_PREFIX}${randomUUID().slice(0, 8)}`;

    return {
      traceId,
      spanId,
      parentId: current?.spanId,
      executionRunId,
      actorType: current?.actorType,
      actorId: current?.actorId,
      timestamp: new Date(),
    };
  }

  /**
   * 设置actor信息
   */
  setActor(actorType: 'human' | 'agent' | 'system', actorId: string): void {
    const current = this.getContext();
    if (current) {
      current.actorType = actorType;
      current.actorId = actorId;
    }
  }

  /**
   * 运行带上下文的异步函数
   */
  runWithContext<T>(context: TraceContext, callback: () => T): T {
    return traceStorage.run(context, callback);
  }

  /**
   * 运行带上下文的异步函数（async版本）
   */
  async runWithContextAsync<T>(
    context: TraceContext,
    callback: () => Promise<T>,
  ): Promise<T> {
    return traceStorage.run(context, callback);
  }

  /**
   * 从请求中提取或生成traceId
   */
  extractTraceId(request: Request): string {
    return (
      (request.headers[TraceContextService.TRACE_ID_HEADER] as string) ||
      (request.headers['x-request-id'] as string) ||
      randomUUID()
    );
  }

  /**
   * 创建请求级别的追踪上下文
   */
  createRequestContext(request: Request): TraceContext {
    return {
      traceId: this.extractTraceId(request),
      spanId: `${TraceContextService.SPAN_ID_PREFIX}${randomUUID().slice(0, 8)}`,
      requestId: request.headers['x-request-id'] as string,
      timestamp: new Date(),
    };
  }

  /**
   * 格式化追踪信息用于日志
   */
  formatForLog(): Record<string, string> {
    const ctx = this.getContext();
    if (!ctx) return {};

    return {
      traceId: ctx.traceId,
      ...(ctx.spanId && { spanId: ctx.spanId }),
      ...(ctx.executionRunId && { executionRunId: ctx.executionRunId }),
      ...(ctx.actorType && { actorType: ctx.actorType }),
      ...(ctx.actorId && { actorId: ctx.actorId }),
    };
  }
}

/**
 * Trace 中间件
 * 自动为每个HTTP请求创建追踪上下文
 */
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  constructor(private readonly traceContext: TraceContextService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const context = this.traceContext.createRequestContext(request);

    // 将traceId添加到响应头，便于客户端追踪
    response.setHeader(TraceContextService.TRACE_ID_HEADER, context.traceId);

    this.traceContext.runWithContext(context, () => {
      next();
    });
  }
}

/**
 * 导出中间件配置工厂
 */
export const traceMiddlewareFactory = (traceContext: TraceContextService) => {
  return new TraceMiddleware(traceContext);
};
