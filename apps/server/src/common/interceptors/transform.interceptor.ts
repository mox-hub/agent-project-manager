import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';

/**
 * 标准 API 响应体结构。
 *
 * - status: HTTP 状态码（200/201/...）
 * - success: 与 status 一致的布尔判断
 * - description: 人类可读描述（成功时为操作摘要，失败时由过滤器填充）
 * - data: 业务数据，无数据时为 null
 * - error: 失败时携带的错误负载（code/message/details）
 * - timestamp: ISO 时间戳
 * - requestId: 请求追踪 ID，便于日志/排障
 *
 * Controller 直接返回领域数据即可（如 `Task`、`User`、`null`），
 * 由本拦截器统一包装为标准响应结构。
 */
export interface ApiResponse<T = unknown> {
  status: number;
  success: boolean;
  description: string;
  data: T | null;
  error?: { code: string; message: string; details?: unknown };
  timestamp: string;
  requestId?: string;
}

const DEFAULT_DESCRIPTION = '操作成功';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse();
    const request = http.getRequest();

    const requestId: string =
      (request.headers?.['x-request-id'] as string) || `req-${randomUUID()}`;

    if (request && typeof request === 'object') {
      request.requestId = requestId;
    }

    return next.handle().pipe(
      map((raw: unknown) => {
        const statusCode = response.statusCode ?? 200;
        return {
          status: statusCode,
          success: statusCode >= 200 && statusCode < 400,
          description: DEFAULT_DESCRIPTION,
          data: (raw ?? null) as T | null,
          timestamp: new Date().toISOString(),
          requestId,
        } satisfies ApiResponse<T>;
      }),
    );
  }
}
