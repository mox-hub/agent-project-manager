import { Injectable, Logger } from '@nestjs/common';
import {
  LINEAR_GRAPHQL_ENDPOINT,
  LINEAR_BACKOFF_BASE_MS,
  LINEAR_BACKOFF_MAX_MS,
  LINEAR_RETRY_MAX,
} from './linear.constants';
import type { LinearGraphQLResponse } from './linear.types';

interface LinearRequestOptions {
  signal?: AbortSignal;
  retry?: number;
}

export class LinearApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
    public readonly errors?: LinearGraphQLResponse<unknown>['errors'],
  ) {
    super(message);
    this.name = 'LinearApiError';
  }
}

interface GraphQLPayload {
  query: string;
  variables?: Record<string, unknown>;
}

/**
 * Linear GraphQL 客户端
 * - 自动处理 429 限流（指数退避）
 * - 自动处理 5xx 服务端错误（带重试）
 * - 401/403 抛出明确异常，不会重试
 * - 暴露底层 `request<T>` 供 Provider 复用
 */
@Injectable()
export class LinearClient {
  private readonly logger = new Logger(LinearClient.name);

  constructor(private readonly apiKey: string) {
    if (!apiKey || !apiKey.trim()) {
      throw new LinearApiError('Linear API key is required');
    }
  }

  private static readonly NON_RETRYABLE_LIKE_CODES = new Set([
    'INVALID_INPUT',
    'FORBIDDEN',
    'UNAUTHORIZED',
    'NOT_FOUND',
    'GRAPHQL_VALIDATION_FAILED',
  ]);

  async request<T>(
    payload: GraphQLPayload,
    options: LinearRequestOptions = {},
  ): Promise<T> {
    const { signal, retry = LINEAR_RETRY_MAX } = options;
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= retry) {
      try {
        const result = await this.doFetch<T>(payload, signal);
        return result;
      } catch (err) {
        lastError = err;
        if (err instanceof LinearApiError) {
          if (
            err.statusCode &&
            err.statusCode >= 400 &&
            err.statusCode < 500 &&
            err.statusCode !== 429
          ) {
            throw err;
          }
          // GraphQL-level validation / permission errors should not retry
          if (err.code && LinearClient.NON_RETRYABLE_LIKE_CODES.has(err.code)) {
            throw err;
          }
        }

        if (attempt >= retry) {
          break;
        }

        const backoffMs = this.computeBackoff(attempt, err);
        this.logger.warn(
          `Linear request failed (attempt ${attempt + 1}/${retry + 1}); retrying in ${backoffMs}ms`,
        );
        await this.sleep(backoffMs, signal);
        attempt += 1;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new LinearApiError('Linear request failed after retries');
  }

  private async doFetch<T>(
    payload: GraphQLPayload,
    signal?: AbortSignal,
  ): Promise<T> {
    const body = JSON.stringify(payload);
    let response: Response;
    try {
      response = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
          'User-Agent': 'apm-agent-project-manager/1.0',
        },
        body,
        signal,
      });
    } catch (err) {
      throw new LinearApiError(
        `Network error: ${(err as Error).message ?? String(err)}`,
      );
    }

    const retryAfter = response.headers.get('retry-after');
    const rateRemaining = response.headers.get('x-ratelimit-remaining');

    let parsed: LinearGraphQLResponse<T> | null = null;
    try {
      parsed = (await response.json()) as LinearGraphQLResponse<T>;
    } catch {
      throw new LinearApiError(
        `Invalid JSON from Linear (status ${response.status})`,
        response.status,
      );
    }

    if (!response.ok) {
      const firstError = parsed?.errors?.[0];
      throw new LinearApiError(
        firstError?.message ?? `Linear HTTP ${response.status}`,
        response.status,
        firstError?.extensions?.code ?? firstError?.extensions?.type,
        parsed?.errors,
      );
    }

    if (parsed?.errors && parsed.errors.length > 0) {
      throw new LinearApiError(
        `Linear GraphQL error: ${parsed.errors
          .map((e) => e.message)
          .join('; ')}`,
        response.status,
        parsed.errors[0]?.extensions?.code ??
          parsed.errors[0]?.extensions?.type,
        parsed.errors,
      );
    }

    if (!parsed || typeof parsed !== 'object' || parsed.data == null) {
      throw new LinearApiError(
        `Linear GraphQL returned no data (rateRemaining=${rateRemaining ?? 'n/a'})`,
        response.status,
      );
    }

    return parsed.data as T;
  }

  private computeBackoff(attempt: number, err: unknown): number {
    if (
      err instanceof LinearApiError &&
      err.statusCode === 429 &&
      typeof err.message === 'string'
    ) {
      // 退避封顶到最大值
      const match = /retry-after[:= ]\s*(\d+)/i.exec(err.message);
      if (match && match[1]) {
        return Math.min(Number(match[1]) * 1000, LINEAR_BACKOFF_MAX_MS);
      }
    }
    const exp = Math.min(
      LINEAR_BACKOFF_BASE_MS * 2 ** attempt,
      LINEAR_BACKOFF_MAX_MS,
    );
    // 加 ±20% 抖动，避免雪崩
    const jitter = Math.round(exp * (Math.random() * 0.4 - 0.2));
    return Math.max(LINEAR_BACKOFF_BASE_MS, exp + jitter);
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      if (signal) {
        const onAbort = () => {
          clearTimeout(t);
          reject(new LinearApiError('Aborted'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }
}
