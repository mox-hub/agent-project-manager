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
      .get<{ data: T }>(url, { params: normalizedParams })
      .then((res) => res.data);
  },
  post: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.post<{ data: T }>(url, data).then((res) => res.data),
  put: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.put<{ data: T }>(url, data).then((res) => res.data),
  patch: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.patch<{ data: T }>(url, data).then((res) => res.data),
  delete: <T = unknown>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete<{ data: T }>(url).then((res) => res.data),
};

export { apiClient };
export default apiClient;
