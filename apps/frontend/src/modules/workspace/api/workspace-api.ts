import { api } from '@/infrastructure/api-client';

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
  api.post(`/workspaces/${id}/activate`).catch(() => undefined);
  window.location.href = redirect;
}

export const workspaceApi = {
  list: () => api.get<{ workspaces: WorkspaceRecord[] }>('/workspaces'),
  create: (data: { name: string; path: string }) =>
    api.post<WorkspaceRecord>('/workspaces', data),
};
