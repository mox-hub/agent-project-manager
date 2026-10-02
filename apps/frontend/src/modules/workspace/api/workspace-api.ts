import { api } from '@/infrastructure/api-client';
import type {
  ApiSchemas,
  RequestBodyOf,
} from '@/infrastructure/api-client/contract';
import { persistWorkspaceToShell } from '@/shared/lib/desktop-session';

/** 请求体单源于契约 CreateWorkspaceDto（name/path） */
export type CreateWorkspaceRequest =
  RequestBodyOf<'WorkspaceController_create'>;

/** 公开名单开关请求体（CAP-A-26）单源于契约 */
export type SetPublicListRequest =
  RequestBodyOf<'WorkspaceController_setPublicList'>;

/** 备份域类型单源于契约（CAP-A-03） */
export type CreateBackupRequest = RequestBodyOf<'WorkspaceController_createBackup'>;
export type RestoreBackupRequest = RequestBodyOf<'WorkspaceController_restoreBackup'>;
export type WorkspaceBackup = ApiSchemas['WorkspaceBackupDto'];
export type RestoreBackupResult = ApiSchemas['RestoreBackupResponseDto'];

/** 备份/恢复走 VACUUM INTO 与整库复制，放宽单请求超时窗口（默认 30s 不够） */
const BACKUP_TIMEOUT_MS = 120_000;

export interface WorkspaceRecord {
  id: string;
  name: string;
  path: string | null;
  isDefault?: boolean;
  createdAt: string;
  lastOpenedAt?: string;
}

export const WORKSPACE_STORAGE_KEY = 'apm-workspace-id';

/** 本机最近使用过的工作区（CAP-A-26 登录卡片在公开名单关闭时的回落项） */
export const RECENT_WORKSPACES_KEY = 'apm-recent-workspaces';
const RECENT_WORKSPACES_LIMIT = 6;

/** 公开名单条目——脱敏：仅 id/名称，**无 path**（与服务端 PublicWorkspaceDto 对齐） */
export interface PublicWorkspace {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface PublicWorkspaceListResult {
  enabled: boolean;
  workspaces: PublicWorkspace[];
}

export function getCurrentWorkspaceId(): string {
  return localStorage.getItem(WORKSPACE_STORAGE_KEY) || 'default';
}

/** 本机最近工作区（去重、最近在前、封顶 RECENT_WORKSPACES_LIMIT） */
export function getRecentWorkspaces(): PublicWorkspace[] {
  try {
    const raw = localStorage.getItem(RECENT_WORKSPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is PublicWorkspace =>
        !!w && typeof w.id === 'string' && typeof w.name === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * 记录一次工作区使用（登录卡片选择/切换工作区时调用）。
 * 纯本地——不含任何安全面，仅用于公开名单关闭时的回落候选。
 */
export function recordRecentWorkspace(ws: PublicWorkspace): void {
  const next = [ws, ...getRecentWorkspaces().filter((w) => w.id !== ws.id)].slice(
    0,
    RECENT_WORKSPACES_LIMIT,
  );
  try {
    localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(next));
  } catch {
    /* 本地存储不可用时静默降级：回落列表为空即可 */
  }
}

/**
 * 设置「当前工作区选择」（localStorage + 壳侧镜像），**不做整页重载**。
 *
 * 与 `switchWorkspace` 的区别：切换工作区需整页重载（会话随库隔离），而登录卡片只是
 * 把选择交给紧随其后的登录请求（api-client 会据此注入 `x-workspace-id`），不需要重载。
 */
export function setWorkspaceSelection(id: string, name?: string): void {
  if (id === 'default') {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } else {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
  }
  persistWorkspaceToShell(id === 'default' ? null : id);
  if (name) {
    recordRecentWorkspace({ id, name });
  }
}

/** 切换工作区：写本地存储后整页重载（会话随工作区隔离，需重新登录） */
export function switchWorkspace(
  id: string,
  redirect = '/login',
  name?: string,
) {
  setWorkspaceSelection(id, name);
  api.post(`/workspaces/${id}/activate`).catch(() => undefined);
  window.location.href = redirect;
}

export const workspaceApi = {
  list: () => api.get<{ workspaces: WorkspaceRecord[] }>('/workspaces'),
  /** 公开名单（未认证可读；开关关闭时 enabled=false 且为空）——CAP-A-26 */
  publicList: () =>
    api.get<PublicWorkspaceListResult>('/workspaces/public'),
  /** 管理员设置是否公开名单（默认关）——CAP-A-26 */
  setPublicList: (data: SetPublicListRequest) =>
    api.put<PublicWorkspaceListResult>('/workspaces/public-list', data),
  create: (data: CreateWorkspaceRequest) =>
    api.post<WorkspaceRecord>('/workspaces', data),
  backups: {
    list: () => api.get<{ backups: WorkspaceBackup[] }>('/workspaces/backups'),
    create: (data: CreateBackupRequest) =>
      api.post<WorkspaceBackup>('/workspaces/backups', data, {
        timeoutMs: BACKUP_TIMEOUT_MS,
      }),
    restore: (backupId: string, data: RestoreBackupRequest) =>
      api.post<RestoreBackupResult>(
        `/workspaces/backups/${encodeURIComponent(backupId)}/restore`,
        data,
        { timeoutMs: BACKUP_TIMEOUT_MS },
      ),
  },
};
