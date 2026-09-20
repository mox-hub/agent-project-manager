import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../core/logger/logger.service';

const MAX_ARRAY_SAMPLE = 5;
/** sample 场景的字符串截断上限（比通用 500 更紧，防长 prompt/文本撑爆日志行） */
const MAX_SAMPLE_STRING = 120;
/** 内置静默路径前缀（轮询类高频端点） */
const DEFAULT_QUIET_PATHS = ['/_api/runtime/dispatches'];

/**
 * 静默路径（前缀匹配）：轮询类高频端点的请求/响应日志降为 debug 级——
 * console（默认 info）不再刷屏，combined.log（debug 级）仍收全量。
 * 可用 LOG_QUIET_PATHS（逗号分隔前缀）追加；每次调用时读取，改动即时生效。
 */
function getQuietPaths(): string[] {
  const extra = process.env.LOG_QUIET_PATHS
    ? process.env.LOG_QUIET_PATHS.split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  return [...DEFAULT_QUIET_PATHS, ...extra];
}

function isQuietPath(url: string): boolean {
  const path = url.split('?')[0];
  return getQuietPaths().some((prefix) => path.startsWith(prefix));
}

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

/** sample 专用压缩：长字符串收紧到 MAX_SAMPLE_STRING，深层结构限深，敏感键脱敏 */
function compactSample(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[Truncated]';
  if (typeof value === 'string') {
    return value.length > MAX_SAMPLE_STRING
      ? `${value.slice(0, MAX_SAMPLE_STRING)}…`
      : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => compactSample(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '***';
      } else {
        result[key] = compactSample(val, depth + 1);
      }
    }
    return result;
  }
  return String(value);
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
        sample: items
          .slice(0, MAX_ARRAY_SAMPLE)
          .map((item) => compactSample(item)),
      };
    }

    if (Array.isArray(obj.data)) {
      const dataArr = obj.data as unknown[];
      return {
        shape: 'list',
        count: dataArr.length,
        sample: dataArr
          .slice(0, MAX_ARRAY_SAMPLE)
          .map((item) => compactSample(item)),
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
    const quiet = isQuietPath(url);

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

    const logInfo = (message: string, meta: Record<string, unknown>) =>
      quiet ? this.logger.debug(message, meta) : this.logger.log(message, meta);

    logInfo(`➡️  ${method} ${url}`, requestMeta);

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

          logInfo(`✅ ${method} ${url}`, responseMeta);
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
