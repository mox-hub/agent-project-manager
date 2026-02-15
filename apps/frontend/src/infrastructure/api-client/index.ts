import axios, { type AxiosInstance, type AxiosError } from 'axios';

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

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/_api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
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
  get: <T = unknown>(url: string, params?: unknown): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }),
  post: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.post(url, data),
  patch: <T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data),
  delete: <T = unknown>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url),
};

export { apiClient };
export default apiClient;
