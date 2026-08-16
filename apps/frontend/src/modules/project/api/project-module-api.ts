import { api } from '@/infrastructure/api-client';

export interface ProjectModule {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchProjectModules(projectId: string): Promise<ProjectModule[]> {
  const res = await api.get<ProjectModule[]>(`/projects/${projectId}/modules`);
  return res;
}

export async function createProjectModule(
  projectId: string,
  dto: { code: string; name: string; description?: string },
): Promise<ProjectModule> {
  const res = await api.post<ProjectModule>(`/projects/${projectId}/modules`, dto);
  return res;
}

export async function updateProjectModule(
  projectId: string,
  moduleId: string,
  dto: { name?: string; description?: string },
): Promise<ProjectModule> {
  const res = await api.patch<ProjectModule>(`/projects/${projectId}/modules/${moduleId}`, dto);
  return res;
}

export async function deleteProjectModule(projectId: string, moduleId: string): Promise<{ ok: boolean }> {
  const res = await api.delete<{ ok: boolean }>(`/projects/${projectId}/modules/${moduleId}`);
  return res;
}
