import { api } from '@/infrastructure/api-client';
import type {
  ApiSchemas,
  RequestBodyOf,
} from '@/infrastructure/api-client/contract';
import { persistWorkspaceToShell } from '@/shared/lib/desktop-session';

/** 请求体单源于契约 CreateWorkspaceDto（name/path） */
export type CreateWorkspaceRequest =
  RequestBodyOf<'WorkspaceController_create'>;

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

export function getCurrentWorkspaceId(): string {
  return localStorage.getItem(WORKSPACE_STORAGE_KEY) || 'default';
}

/** 切换工作区：写本地存储后整页重载（会话随工作区隔离，需重新登录） */
export function switchWorkspace(id: string, redirect = '/login') {
  if (id === 'default') {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } else {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
  }
  persistWorkspaceToShell(id === 'default' ? null : id);
  api.post(`/workspaces/${id}/activate`).catch(() => undefined);
  window.location.href = redirect;
}

export const workspaceApi = {
  list: () => api.get<{ workspaces: WorkspaceRecord[] }>('/workspaces'),
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
