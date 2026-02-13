import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();

    const method = (req as any)?.method ?? 'UNKNOWN';
    const url = (req as any)?.url ?? 'UNKNOWN';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${method} ${url} ${ms}ms`);
        },
        error: (err) => {
          const ms = Date.now() - start;
          this.logger.error(`${method} ${url} ${ms}ms`, err?.stack);
        },
      }),
    );
  }
}
