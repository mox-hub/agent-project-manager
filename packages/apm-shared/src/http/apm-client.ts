/**
 * 类型化 REST 客户端：baseURL + JWT + x-workspace-id + envelope 解包 + 错误映射
 *
 * 后端所有响应（含 Public 端点）统一为 TransformInterceptor 包裹的 envelope：
 *   { status, success, description, data, timestamp, requestId }
 * 失败时为 GlobalExceptionFilter 的同构 envelope（带 error: {code,message,details}）。
 * 本客户端成功时取 data 字段；失败时解析为 ApmError。
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApmError, parseBackendError } from '../errors';

interface ApiEnvelope<T = unknown> {
  status: number;
  success: boolean;
  description: string;
  data: T | null;
  error?: { code?: string; message?: string; details?: unknown };
  timestamp: string;
  requestId?: string;
}

export interface ApmClientOptions {
  backend: string;
  workspaceId?: string;
  getToken?: () => string | undefined;
  timeout?: number;
  /** 附加请求头（如 runtime 的 x-runtime-session-id / x-runtime-session-token） */
  extraHeaders?: () => Record<string, string>;
}

export class ApmClient {
  private readonly http: AxiosInstance;
  private readonly opts: ApmClientOptions;

  constructor(opts: ApmClientOptions) {
    this.opts = opts;
    this.http = axios.create({
      baseURL: opts.backend.replace(/\/+$/, ''),
      timeout: opts.timeout ?? 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.opts.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (this.opts.workspaceId) headers['x-workspace-id'] = this.opts.workspaceId;
    if (this.opts.extraHeaders) {
      Object.assign(headers, this.opts.extraHeaders());
    }
    return headers;
  }

  /**
   * 路径规范化：接受 /_api/... 完整路径或 /tasks 简写，自动补 /_api 前缀。
   * 兼容 ./ 或 .\ 前缀（Git Bash 下规避 MSYS2 路径转换可用 ./projects）。
   */
  static normalizePath(path: string): string {
    let p = path.trim();
    if (!p) throw new ApmError('路径不能为空');
    p = p.replace(/^[./\\]+/, '/');
    if (!p.startsWith('/')) p = `/${p}`;
    if (!p.startsWith('/_api')) p = `/_api${p}`;
    return p;
  }

  /** envelope 解包：是 envelope 则取 data，否则原样返回（兼容未包裹端点） */
  private static unwrap<T>(body: unknown): T {
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      const env = body as ApiEnvelope<T>;
      return (env.data ?? null) as T;
    }
    return body as T;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method: method.toUpperCase(),
      url: ApmClient.normalizePath(path),
      headers: this.buildHeaders(),
      params: query,
    };
    if (body !== undefined) config.data = body;
    try {
      const res = await this.http.request<unknown>(config);
      return ApmClient.unwrap<T>(res.data);
    } catch (err) {
      throw parseBackendError(err);
    }
  }

  get<T = unknown>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  post<T = unknown>(path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', path, body, query);
  }

  put<T = unknown>(path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PUT', path, body, query);
  }

  patch<T = unknown>(path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PATCH', path, body, query);
  }

  delete<T = unknown>(path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', path, body, query);
  }
}
