import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TraceContextService } from './trace-context.service';

/**
 * 追踪拦截器
 * 自动记录每个请求的追踪信息到日志
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  constructor(private readonly traceContext: TraceContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = this.traceContext.getContext();
    const traceInfo = this.traceContext.formatForLog();

    // HTTP 请求信息
    const http = context.switchToHttp();
    const request = http.getRequest();
    const method = request?.method || 'UNKNOWN';
    const url = request?.url || 'UNKNOWN';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          // 通过 LoggerService 输出，带 traceId
          console.log(
            JSON.stringify({
              type: 'request',
              method,
              url,
              duration,
              status: 'success',
              ...traceInfo,
            }),
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          console.log(
            JSON.stringify({
              type: 'request',
              method,
              url,
              duration,
              status: 'error',
              error: error.message,
              stack: error.stack,
              ...traceInfo,
            }),
          );
        },
      }),
    );
  }
}
