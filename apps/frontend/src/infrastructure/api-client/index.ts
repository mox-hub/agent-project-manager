import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { serializeFilters } from '@/shared/filters/adapters';
import { logger } from '@/shared/lib/logger';
import {
  ApiClientError,
  type BackendEnvelope,
  type PaginatedData,
} from '@/shared/types/api';

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.__DESKTOP_API_BASE_URL__) {
    return window.__DESKTOP_API_BASE_URL__;
  }
  return import.meta.env.VITE_API_BASE_URL || '/_api';
}

const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RequestMeta extends InternalAxiosRequestConfig {
  metadata?: { startTime: number };
}

apiClient.interceptors.request.use((config: RequestMeta) => {
  config.baseURL = getBaseUrl();
  const token = localStorage.getItem('access_token') as string;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.metadata = { startTime: Date.now() };
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const cfg = response.config as RequestMeta;
    const duration = cfg.metadata ? Date.now() - cfg.metadata.startTime : -1;
    logger.api(
      cfg.method?.toUpperCase() || 'GET',
      `${cfg.baseURL ?? ''}${cfg.url ?? ''}`,
      response.status,
      duration,
      response.data,
    );
    return response;
  },
  (error: AxiosError<BackendEnvelope<unknown>>) => {
    const cfg = (error.config ?? {}) as RequestMeta;
    const duration = cfg.metadata ? Date.now() - cfg.metadata.startTime : -1;
    const status = error.response?.status ?? 0;
    const endpoint = `${cfg.baseURL ?? ''}${cfg.url ?? ''}`;
    const body = error.response?.data;

    logger.api(
      cfg.method?.toUpperCase() || 'GET',
      endpoint,
      status,
      duration,
      body,
    );

    if (status === 401) {
      localStorage.removeItem('access_token');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiClientError({
        code: body?.error?.code ?? 'UNAUTHORIZED',
        message: body?.description ?? body?.error?.message ?? '未登录',
        status,
        details: body?.error?.details,
        requestId: body?.requestId,
        endpoint,
      });
    }

    if (body && typeof body === 'object' && body.error) {
      throw new ApiClientError({
        code: body.error.code ?? 'UNKNOWN',
        message: body.description ?? body.error.message ?? '请求失败',
        status,
        details: body.error.details,
        requestId: body.requestId,
        endpoint,
      });
    }

    if (status === 0) {
      throw new ApiClientError({
        code: 'NETWORK_ERROR',
        message: error.message || '网络异常',
        status: 0,
        endpoint,
      });
    }

    throw new ApiClientError({
      code: `HTTP_${status}`,
      message: error.message || `HTTP ${status}`,
      status,
      endpoint,
    });
  },
);

/**
 * Unwrap a backend envelope to its business data.
 * Returns `null` when the body is null/undefined.
 * Throws ApiClientError when the envelope is an error envelope.
 */
function unwrapEnvelope<T>(body: unknown): T {
  if (body === null || body === undefined) return null as T;

  if (typeof body === 'object') {
    const env = body as Partial<BackendEnvelope<T>>;
    if (env.success === true && 'data' in env) {
      return (env.data ?? null) as T;
    }
    if (env.success === false && env.error) {
      throw new ApiClientError({
        code: env.error.code,
        message: env.description ?? env.error.message,
        status: env.status ?? 500,
        details: env.error.details,
        requestId: env.requestId,
      });
    }
  }

  return body as T;
}

export interface RequestOptions {
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  data?: unknown;
}

function normalizeParams(params: unknown): Record<string, unknown> | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const p = params as Record<string, unknown>;
  if ('filters' in p && p.filters && typeof p.filters === 'object') {
    return {
      ...p,
      filters: serializeFilters(
        p.filters as Record<string, string[] | undefined>,
      ),
    };
  }
  return p;
}

export const api = {
  get: <T = unknown>(url: string, params?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient
      .get<unknown>(url, {
        params: options?.params ?? normalizeParams(params),
        signal: options?.signal,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  post: <T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient
      .post<unknown>(url, data, {
        params: options?.params,
        signal: options?.signal,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  put: <T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient
      .put<unknown>(url, data, {
        params: options?.params,
        signal: options?.signal,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  patch: <T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient
      .patch<unknown>(url, data, {
        params: options?.params,
        signal: options?.signal,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  delete: <T = unknown>(url: string, options?: RequestOptions): Promise<T> =>
    apiClient
      .delete<unknown>(url, {
        params: options?.params,
        signal: options?.signal,
        data: options?.data,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  /**
   * Helper for paginated list endpoints.
   * Returns the `PaginatedData<T>` payload directly.
   */
  getPaginated: <T = unknown>(url: string, params?: unknown, options?: RequestOptions): Promise<PaginatedData<T>> =>
    api.get<PaginatedData<T>>(url, params, options),
};

export { apiClient };
export { ApiClientError };
export default apiClient;
