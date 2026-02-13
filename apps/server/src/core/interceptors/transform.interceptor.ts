import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type ApiSuccessResponse<T> = { data: T };

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<unknown>> {
    return next.handle().pipe(
      map((value) => {
        if (
          value &&
          typeof value === 'object' &&
          ('data' in (value as any) || 'error' in (value as any))
        ) {
          return value as ApiSuccessResponse<unknown>;
        }
        return { data: value };
      }),
    );
  }
}
