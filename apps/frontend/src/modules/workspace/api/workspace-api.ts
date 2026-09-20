import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';
import { persistWorkspaceToShell } from '@/shared/lib/desktop-session';

/** 请求体单源于契约 CreateWorkspaceDto（name/path） */
export type CreateWorkspaceRequest =
  RequestBodyOf<'WorkspaceController_create'>;

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
};
