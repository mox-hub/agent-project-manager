import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { serializeFilters } from '@/shared/filters/adapters';

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    statusCode?: number;
    details?: unknown;
  };
}

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

apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  const token = localStorage.getItem('access_token') as string;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    const apiError = error.response?.data?.error;
    if (apiError) {
      if (apiError.code === 'UNAUTHORIZED' || error.response?.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

type BackendEnvelope = {
  success?: boolean;
  statusCode?: number;
  data?: unknown;
  error?: unknown;
  timestamp?: string;
};

function unwrapEnvelope(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const env = body as BackendEnvelope;
  // 后端全局 TransformInterceptor 把成功响应包成 { success, statusCode, data, timestamp }
  // 失败响应是 { statusCode, message, error, timestamp, path }
  // 这里只对"成功形态"做剥离, 失败形态交给 axios 错误拦截器
  if (
    'success' in env &&
    env.success === true &&
    'data' in env
  ) {
    return { data: env.data };
  }
  return body;
}

export const api = {
  get: <T = unknown>(url: string, params?: unknown): Promise<ApiResponse<T>> => {
    let normalizedParams = params as Record<string, unknown> | undefined;

    if (
      normalizedParams &&
      typeof normalizedParams === 'object' &&
      'filters' in normalizedParams &&
      normalizedParams.filters &&
      typeof normalizedParams.filters === 'object'
    ) {
      normalizedParams = {
        ...normalizedParams,
        filters: serializeFilters(
          normalizedParams.filters as Record<string, string[] | undefined>,
        ),
      };
    }

    return apiClient
      .get<unknown>(url, { params: normalizedParams })
      .then((res) => unwrapEnvelope(res.data) as ApiResponse<T>);
  },
  post: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.post<unknown>(url, data).then((res) => unwrapEnvelope(res.data) as ApiResponse<T>),
  put: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.put<unknown>(url, data).then((res) => unwrapEnvelope(res.data) as ApiResponse<T>),
  patch: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.patch<unknown>(url, data).then((res) => unwrapEnvelope(res.data) as ApiResponse<T>),
  delete: <T = unknown>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete<unknown>(url).then((res) => unwrapEnvelope(res.data) as ApiResponse<T>),
};

export { apiClient };
export default apiClient;
