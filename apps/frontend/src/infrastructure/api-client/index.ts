import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { serializeFilters } from '@/shared/filters/adapters';
import { logger } from '@/shared/lib/logger';
import {
  persistTokenToShell,
  persistWorkspaceToShell,
} from '@/shared/lib/desktop-session';
import { getApiBaseUrl, isDesktopShellAvailable } from '@/shared/types/electron-api';
import { unwrapEnvelope as parseEnvelope } from '@apm/shared/http/envelope';
import {
  ApiClientError,
  type BackendEnvelope,
  type BackendErrorEnvelope,
  type PaginatedData,
} from '@/shared/types/api';

function normalizeBaseUrl(raw: string | undefined): string {
  const fallback = '/_api';
  if (!raw || raw.trim() === '') return fallback;

  const trimmed = raw.replace(/\/+$/, '');
  // If the raw value already contains the API path segment, keep it as is
  // (e.g. http://localhost:4300/_api). Otherwise append it so the global
  // prefix configured on the NestJS backend is always honored.
  if (trimmed.endsWith('/_api')) return trimmed;
  return `${trimmed}/_api`;
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.__DESKTOP_API_BASE_URL__) {
      return normalizeBaseUrl(window.__DESKTOP_API_BASE_URL__);
    }
    const custom = localStorage.getItem('apm_custom_api_base_url');
    if (custom && custom.trim() !== '') {
      return normalizeBaseUrl(custom.trim());
    }
  }
  return normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
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
  /** 已尝试过「去掉工作区作用域重放」，防递归 */
  workspaceScopeRetried?: boolean;
  /** 本次请求显式不带 x-workspace-id（重放时置位） */
  skipWorkspaceHeader?: boolean;
}

const WORKSPACE_STORAGE_KEY = 'apm-workspace-id';

/**
 * 「工作区选择与当前会话不同源，已被自动重置」的待告知记录。
 *
 * 为什么必须告知：重置是**用户可见**的状态变更（用户会发现自己回到了默认工作区）。
 * 数据面只负责记录，由 UI 层（use-auth）在会话校验/登录成功后取走并提示——
 * infrastructure 不直接依赖 UI 组件。
 */
let pendingWorkspaceReset: { workspaceId: string } | null = null;

/** 取走一次性「工作区选择已被重置」记录（无记录返回 null）。 */
export function consumeWorkspaceReset(): { workspaceId: string } | null {
  const next = pendingWorkspaceReset;
  pendingWorkspaceReset = null;
  return next;
}

function currentWorkspaceId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  return raw && raw.trim() !== '' ? raw.trim() : null;
}

/**
 * 丢弃与当前会话不同源的工作区选择（localStorage + 壳侧镜像）并登记待告知记录。
 *
 * 为什么必须丢弃：服务端数据层按 `x-workspace-id` 路由到对应工作区 SQLite 库，而
 * 主体身份/会话（User / Session）在各库中独立存在——库内没有该主体的记录时，
 * `POST /auth/login` 报 INVALID_CREDENTIALS（**正确密码也显示密码错误**）、
 * `GET /auth/me` 报 401、未注册的库报 404 WORKSPACE_NOT_FOUND。于是形成死循环：
 * 请求 401 → 清登录态 → 踢回 /login → 登录请求仍带该 id → 再次 401。
 * 重登也无法自救：id 同时镜像在壳侧 desktop-state.json，重启依旧恢复。
 * 故此处必须同时清 localStorage 与壳侧镜像，否则下一次启动原样复发。
 */
function dropWorkspaceSelection(): string | null {
  const previous = currentWorkspaceId();
  if (!previous) {
    return null;
  }
  localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  persistWorkspaceToShell(null);
  pendingWorkspaceReset = { workspaceId: previous };
  logger.warn(
    `工作区选择 "${previous}" 与当前会话不匹配，已重置为默认工作区（localStorage + 壳侧镜像）`,
  );
  return previous;
}

/**
 * 去掉 x-workspace-id 按原请求重放一次。
 *
 * 命中形态唯一：带 id 被拒、不带 id 正常 ⇒ 该选择对本会话无效（另一库没有该主体）。
 * 重放仍失败时不改动任何本地状态（不丢选择、不误清登录态），交回原有错误处理。
 * 重放安全性：401/404 由全局 JwtGuard/数据层在进入 handler 前抛出，被拒请求无副作用。
 */
async function replayWithoutWorkspaceScope(
  config: RequestMeta,
): Promise<AxiosResponse<unknown> | null> {
  if (config.workspaceScopeRetried) {
    return null;
  }
  config.workspaceScopeRetried = true;
  const headers = AxiosHeaders.from(
    config.headers as unknown as Record<string, string>,
  );
  headers.delete('x-workspace-id');
  const replayConfig: RequestMeta = { ...config, headers, skipWorkspaceHeader: true };
  try {
    return await apiClient.request(replayConfig);
  } catch {
    return null;
  }
}

/**
 * 桌面壳内未钉底 = 不知道后端在哪。
 * 此时回落 `/_api`（Vite 代理默认端口 4300）会打到上一代遗留的僵尸后端：有效 token
 * 被陈旧实例判 401 → 清登录态 → 踢回 /login → 弹出认证窗（实机「登录后自动弹出到
 * 登录页」根因）。宁可显式失败，交由调用方按传输错误处理。
 */
function desktopApiBaseUnavailable(): boolean {
  return isDesktopShellAvailable() && !getApiBaseUrl();
}

apiClient.interceptors.request.use((config: RequestMeta) => {
  if (desktopApiBaseUnavailable()) {
    return Promise.reject(
      new ApiClientError({
        code: 'DESKTOP_API_BASE_UNAVAILABLE',
        message: '桌面壳后端地址尚未就绪',
        status: 0,
        endpoint: config.url ?? '',
      }),
    );
  }
  config.baseURL = getBaseUrl();
  const token = localStorage.getItem('access_token') as string;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // 工作区路由：业务请求携带 x-workspace-id。两类前缀**默认不带**：
  //  - `/workspaces`：工作区元数据端点，创建/列表须在默认库校验身份或公开访问；
  //  - `/invites`：团队邀请。令牌自身即指向目标工作区，服务端据此跨库定位（TeamInvite
  //    无 workspaceId 字段）；而接受邀请必须在「用户自己账号所在的库」校验登录态，
  //    带上选中工作区头会在守卫处先被 401 拦掉（CAP-A-25 ④ 的落地前提）。
  // 重放请求（skipWorkspaceHeader）显式不带该头。
  if (config.skipWorkspaceHeader) {
    config.headers.delete('x-workspace-id');
  } else {
    const workspaceId = currentWorkspaceId();
    const workspaceAgnostic =
      config.url?.startsWith('/workspaces') ||
      config.url?.startsWith('/invites');
    if (workspaceId && !workspaceAgnostic) {
      config.headers['x-workspace-id'] = workspaceId;
    }
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
  async (error: AxiosError<BackendEnvelope<unknown>>) => {
    const cfg = (error.config ?? {}) as RequestMeta;
    const duration = cfg.metadata ? Date.now() - cfg.metadata.startTime : -1;
    const status = error.response?.status ?? 0;
    const endpoint = `${cfg.baseURL ?? ''}${cfg.url ?? ''}`;
    const body = error.response?.data as
      | Partial<BackendErrorEnvelope>
      | undefined;

    logger.api(
      cfg.method?.toUpperCase() || 'GET',
      endpoint,
      status,
      duration,
      body,
    );

    // 只有「确实打到壳侧钉底后端」的 401 才算会话失效。异源 401（回落地址、僵尸
    // 后端、代理默认端口）必须按传输错误处理——否则一次误判就清登录态、写空壳侧
    // 镜像并踢回 /login，认证面挂紧凑窗钩子随即弹出认证窗。
    const pinnedBase = getApiBaseUrl();
    const fromSelectedBackend =
      !isDesktopShellAvailable() || !pinnedBase || endpoint.includes(pinnedBase);

    const backendCode = body?.error?.code;

    // 工作区作用域自愈（必须先于任何「清登录态/踢登录页」动作）：
    // 选择的工作区与当前会话不同源时，带 x-workspace-id 必被拒（401），丢掉该选择
    // 重放即恢复——用户不必重新登录，更不该看到登录页。重放失败则不改本地状态，
    // 落到下方既有处理（真失效会话仍然是 401 踢登录页）。
    if (
      fromSelectedBackend &&
      !cfg.workspaceScopeRetried &&
      currentWorkspaceId() &&
      (status === 401 || backendCode === 'WORKSPACE_NOT_FOUND')
    ) {
      const replayed = await replayWithoutWorkspaceScope(cfg);
      if (replayed) {
        // 不带 id 能过 ⇒ 该选择对本会话无效，丢弃（含壳侧镜像，防重启复发）
        dropWorkspaceSelection();
        return replayed;
      }
    }

    // 工作区确实不存在（未注册/库文件缺失）：选择本身即失效，无需等重放成功
    if (status === 404 && backendCode === 'WORKSPACE_NOT_FOUND') {
      dropWorkspaceSelection();
    }

    if (status === 401) {
      if (!fromSelectedBackend) {
        logger.warn(`忽略异源 401（当前后端 ${pinnedBase}）: ${endpoint}`);
        throw new ApiClientError({
          code: 'BACKEND_MISMATCH',
          message: '请求未命中当前后端，已忽略该 401',
          status: 0,
          endpoint,
        });
      }
      localStorage.removeItem('access_token');
      persistTokenToShell(null);
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      // 启动页与登录页本身不应被 401 重定向踢出流程
      const isBootOrLogin = pathname === '/login' || pathname === '/boot' || pathname === '/';
      if (typeof window !== 'undefined' && !isBootOrLogin) {
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

    if (body?.error) {
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
      // 区分前端超时与网络断开：axios 超时（config.timeout 触发）code 为
      // ECONNABORTED（部分环境为 ETIMEDOUT）。不区分的话组件只能拿到英文
      // axios 默认文案（"timeout of 30000ms exceeded"），无法展示 i18n 超时提示。
      const isTimeout =
        error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      throw new ApiClientError({
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: isTimeout ? '请求超时' : error.message || '网络异常',
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
 * 解析逻辑单源于 @apm-shared/http/envelope，这里只负责错误抛出。
 */
function unwrapEnvelope<T>(body: unknown): T {
  const { data, error } = parseEnvelope<T>(body);
  if (error) {
    throw new ApiClientError({
      code: error.error.code,
      message: error.description ?? error.error.message,
      status: error.status ?? 500,
      details: error.error.details,
      requestId: error.requestId,
    });
  }
  return data as T;
}

export interface RequestOptions {
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  data?: unknown;
  /**
   * 单请求超时覆盖（ms）：仅覆盖本次请求的 axios timeout，
   * 不改全局实例默认值（30s）。供长耗时请求（如 AI 供应商测试连接）
   * 放宽窗口；不传走实例默认。
   */
  timeoutMs?: number;
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
        timeout: options?.timeoutMs,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  post: <T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient
      .post<unknown>(url, data, {
        params: options?.params,
        signal: options?.signal,
        timeout: options?.timeoutMs,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  put: <T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient
      .put<unknown>(url, data, {
        params: options?.params,
        signal: options?.signal,
        timeout: options?.timeoutMs,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  patch: <T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient
      .patch<unknown>(url, data, {
        params: options?.params,
        signal: options?.signal,
        timeout: options?.timeoutMs,
      })
      .then((res) => unwrapEnvelope<T>(res.data)),

  delete: <T = unknown>(url: string, options?: RequestOptions): Promise<T> =>
    apiClient
      .delete<unknown>(url, {
        params: options?.params,
        signal: options?.signal,
        data: options?.data,
        timeout: options?.timeoutMs,
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
export { getBaseUrl as getApiBaseUrl };
export default apiClient;
