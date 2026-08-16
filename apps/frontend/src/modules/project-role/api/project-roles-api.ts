import { api } from '@/infrastructure/api-client';

export type ExecutionRole = 'coder' | 'reviewer' | 'pm' | 'qa' | 'general';
export type CliProviderId = 'claude-code' | 'codex' | 'zcode';

export interface ProjectRole {
  id: string;
  projectId: string | null;
  key: string;
  name: string;
  description: string | null;
  executionRole: ExecutionRole;
  defaultCliProviderId: CliProviderId | null;
  promptHint: string | null;
  defaultAssigneeIds: unknown | null;
  metadata: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectRoleInput {
  key?: string;
  name: string;
  description?: string;
  executionRole?: ExecutionRole;
  defaultCliProviderId?: CliProviderId | string | null;
  promptHint?: string;
}

export interface UpdateProjectRoleInput {
  name?: string;
  description?: string;
  executionRole?: ExecutionRole;
  defaultCliProviderId?: CliProviderId;
  promptHint?: string;
}

export const projectRolesApi = {
  list: (projectId: string) =>
    api.get<{ projectRoles: ProjectRole[]; globalRoles: ProjectRole[] }>(
      `/projects/${projectId}/roles`,
    ),
  listTemplates: (projectId: string) =>
    api.get<ProjectRole[]>(`/projects/${projectId}/roles/templates`),
  create: (projectId: string, data: CreateProjectRoleInput) =>
    api.post<ProjectRole>(`/projects/${projectId}/roles`, data),
  update: (projectId: string, id: string, data: UpdateProjectRoleInput) =>
    api.patch<ProjectRole>(`/projects/${projectId}/roles/${id}`, data),
  remove: (projectId: string, id: string) =>
    api.delete<{ success: boolean }>(`/projects/${projectId}/roles/${id}`),
  seedFromGlobal: (projectId: string) =>
    api.post<{ created: number; roles: ProjectRole[] }>(
      `/projects/${projectId}/roles/seed-from-global`,
    ),
};

// 同时导出单独的 named functions，让 `import * as api from ...` 也能用
export const listProjectRoles = (projectId: string) =>
  api.get<{ projectRoles: ProjectRole[]; globalRoles: ProjectRole[] }>(
    `/projects/${projectId}/roles`,
  );
export const listProjectRoleTemplates = (projectId: string) =>
  api.get<ProjectRole[]>(`/projects/${projectId}/roles/templates`);
export const createProjectRole = (
  projectId: string,
  data: CreateProjectRoleInput,
) => api.post<ProjectRole>(`/projects/${projectId}/roles`, data);
export const updateProjectRole = (
  projectId: string,
  id: string,
  data: UpdateProjectRoleInput,
) => api.patch<ProjectRole>(`/projects/${projectId}/roles/${id}`, data);
export const removeProjectRole = (projectId: string, id: string) =>
  api.delete<{ success: boolean }>(`/projects/${projectId}/roles/${id}`);
export const seedProjectRolesFromGlobal = (projectId: string) =>
  api.post<{ created: number; roles: ProjectRole[] }>(
    `/projects/${projectId}/roles/seed-from-global`,
  );
