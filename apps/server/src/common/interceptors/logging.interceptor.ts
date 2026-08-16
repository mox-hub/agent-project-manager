import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../core/logger/logger.service';

const MAX_INLINE_LENGTH = 2000;
const MAX_ARRAY_SAMPLE = 5;
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'apikey',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[Truncated]';
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '***';
      } else {
        result[key] = sanitize(val, depth + 1);
      }
    }
    return result;
  }
  return String(value);
}

function inline(value: unknown): string {
  try {
    const sanitized = sanitize(value);
    const text = JSON.stringify(sanitized);
    return text.length > MAX_INLINE_LENGTH
      ? `${text.slice(0, MAX_INLINE_LENGTH)}…[+${text.length - MAX_INLINE_LENGTH}chars]`
      : text;
  } catch {
    return '[Unserializable]';
  }
}

function summarize(data: unknown): {
  shape: string;
  count?: number;
  total?: number;
  sample?: unknown[];
} {
  if (data === null || data === undefined) {
    return { shape: 'null' };
  }

  if (Array.isArray(data)) {
    return { shape: 'Array', count: data.length };
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.items)) {
      const items = obj.items as unknown[];
      const total = typeof obj.total === 'number' ? obj.total : items.length;
      return {
        shape: 'page',
        count: items.length,
        total,
        sample: items.slice(0, MAX_ARRAY_SAMPLE),
      };
    }

    if (Array.isArray(obj.data)) {
      const dataArr = obj.data as unknown[];
      return {
        shape: 'list',
        count: dataArr.length,
        sample: dataArr.slice(0, MAX_ARRAY_SAMPLE),
      };
    }

    if (obj.data !== undefined) {
      return { shape: `data:${describe(obj.data)}` };
    }

    const keys = Object.keys(obj);
    return { shape: `object{${keys.length}}` };
  }

  return { shape: typeof data };
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `object{${keys.slice(0, 6).join(',')}${keys.length > 6 ? '…' : ''}}`;
  }
  return typeof value;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    const hasQuery = request.query && Object.keys(request.query).length > 0;
    const hasBody =
      request.body &&
      typeof request.body === 'object' &&
      Object.keys(request.body).length > 0 &&
      method !== 'GET';

    const requestMeta: Record<string, unknown> = {
      method,
      url,
      ip,
      userAgent: userAgent.substring(0, 120),
    };
    if (hasQuery) requestMeta.query = sanitize(request.query);
    if (hasBody) requestMeta.body = sanitize(request.body);

    this.logger.log(`➡️  ${method} ${url}`, requestMeta);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const response = http.getResponse();
          const statusCode = response.statusCode;
          const delay = Date.now() - now;
          const summary = summarize(responseData);

          const responseMeta: Record<string, unknown> = {
            method,
            url,
            statusCode,
            durationMs: delay,
            responseShape: summary.shape,
          };
          if (summary.count !== undefined)
            responseMeta.itemCount = summary.count;
          if (summary.total !== undefined)
            responseMeta.totalCount = summary.total;
          if (summary.sample) responseMeta.sample = summary.sample;

          this.logger.log(`✅ ${method} ${url}`, responseMeta);
        },
        error: (error) => {
          const delay = Date.now() - now;
          const statusCode = error?.status ?? error?.statusCode ?? 500;

          const errorMeta: Record<string, unknown> = {
            method,
            url,
            statusCode,
            durationMs: delay,
            errorMessage: error?.message,
          };
          if (error?.response && typeof error.response === 'object') {
            errorMeta.responseBody = sanitize(error.response);
          }

          this.logger.error(
            `❌ ${method} ${url} - ${statusCode}`,
            error?.stack,
            errorMeta,
          );
        },
      }),
    );
  }
}
