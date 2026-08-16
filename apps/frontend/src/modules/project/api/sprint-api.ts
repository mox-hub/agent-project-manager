import { api } from '@/infrastructure/api-client';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export interface CreateSprintRequest {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSprintRequest {
  name?: string;
  goal?: string;
  status?: Sprint['status'];
  startDate?: string;
  endDate?: string;
}

export const sprintApi = {
  list: (projectId: string) =>
    api.get<Sprint[]>(`/projects/${projectId}/iterations`),

  get: (projectId: string, sprintId: string) =>
    api.get<Sprint>(`/projects/${projectId}/iterations/${sprintId}`),

  create: (projectId: string, data: CreateSprintRequest) =>
    api.post<Sprint>(`/projects/${projectId}/iterations`, data),

  update: (projectId: string, sprintId: string, data: UpdateSprintRequest) =>
    api.patch<Sprint>(`/projects/${projectId}/iterations/${sprintId}`, data),

  delete: (projectId: string, sprintId: string) =>
    api.delete<void>(`/projects/${projectId}/iterations/${sprintId}`),

  start: (projectId: string, sprintId: string) =>
    api.post<Sprint>(`/projects/${projectId}/iterations/${sprintId}/start`),

  complete: (projectId: string, sprintId: string) =>
    api.post<Sprint>(`/projects/${projectId}/iterations/${sprintId}/complete`),

  cancel: (projectId: string, sprintId: string) =>
    api.post<Sprint>(`/projects/${projectId}/iterations/${sprintId}/cancel`),
};
