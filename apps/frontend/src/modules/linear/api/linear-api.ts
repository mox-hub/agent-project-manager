import { api } from '@/infrastructure/api-client';

export interface LinearViewer {
  id: string;
  name: string;
  email: string;
  organizations: { id: string; name: string; urlKey?: string }[];
  teams: { id: string; key: string; name: string; description?: string }[];
}

export interface LinearRemoteProject {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  url?: string | null;
  state?: string | null;
  priority?: number | null;
  teams?: { id: string; key: string; name: string }[];
  updatedAt: string;
}

export interface LinearRemoteIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  priority?: number | null;
  url: string;
  state?: { id: string; name: string; type: string } | null;
  updatedAt: string;
}

export type SyncDirection = 'pull' | 'push' | 'two-way' | 'force-pull' | 'force-push';

export interface SyncSummary {
  added: number;
  updated: number;
  conflicts: number;
  errors: number;
  errors_detail?: Array<{ id?: string; message: string }>;
}

export interface SyncProgress {
  phase: 'fetching' | 'syncing' | 'completed' | 'error';
  current: number;
  total: number;
  message: string;
  currentItem?: string;
}

export interface SyncJobResponse {
  jobId: string;
  status: 'started';
}

export interface SyncLog {
  id: string;
  integrationId: string;
  projectId: string | null;
  resourceType: 'project' | 'task';
  resourceId: string | null;
  action: string;
  direction?: string;
  status: 'success' | 'failed' | 'conflict';
  message?: string | null;
  createdAt: string;
}

export interface TestConnectionResponse {
  ok: boolean;
  viewer: LinearViewer;
}

export const linearApi = {
  testConnection: (integrationId: string) =>
    api.get<TestConnectionResponse>(`/integrations/linear/test/${integrationId}`),

  listRemoteProjects: (integrationId: string) =>
    api.get<LinearRemoteProject[]>(
      `/integrations/linear/${integrationId}/projects`,
    ),

  syncProject: (data: {
    integrationId: string;
    linearProjectId: string;
    targetLocalProjectId?: string;
  }) => api.post<{ projectId: string; created: boolean }>(
    `/integrations/linear/sync/project`,
    data,
  ),

  syncTasks: (data: {
    projectId: string;
    direction: SyncDirection;
    taskIds?: string[];
    confirm?: boolean;
  }) => api.post<SyncSummary>(`/integrations/linear/sync/tasks`, data),

  pushCreateIssue: (data: { projectId: string; localTaskId: string }) =>
    api.post<{ taskId: string; identifier: string; url: string }>(
      `/integrations/linear/sync/task/push-create`,
      data,
    ),

  resolveConflict: (data: {
    taskId: string;
    resolution: 'use_linear' | 'use_local' | 'keep_both';
  }) =>
    api.post<{ resolution: string; createdRemoteCopyId?: string }>(
      `/integrations/linear/sync/task/${data.taskId}/resolve`,
      data,
    ),

  listLogs: (integrationId: string, params?: { projectId?: string; limit?: number }) =>
    api.get<SyncLog[]>(
      `/integrations/linear/${integrationId}/sync-logs`,
      params,
    ),
};

export const IntegrationKeys = {
  details: (id: string) => ['integration', id] as const,
  linearViewer: (integrationId: string) =>
    ['linear-viewer', integrationId] as const,
  linearRemoteProjects: (integrationId: string) =>
    ['linear-remote-projects', integrationId] as const,
  syncLogs: (integrationId: string) =>
    ['linear-sync-logs', integrationId] as const,
};
