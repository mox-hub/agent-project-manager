import { api } from '@/infrastructure/api-client';

export interface TaskTemplateItem {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate?: number;
  parentItemId?: string;
}

export interface TaskTemplate {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  category?: string;
  items: TaskTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  projectId?: string;
  category?: string;
  items?: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    estimate?: number;
    parentItemId?: string;
  }[];
}

export interface UseTemplateRequest {
  projectId: string;
}

export interface UseTemplateResponse {
  template: string;
  tasksCreated: number;
  tasks: {
    id: string;
    title: string;
  }[];
}

export const taskTemplateApi = {
  getAll: (projectId?: string) =>
    api.get<TaskTemplate[]>('/task-templates', { projectId }),

  getById: (id: string) =>
    api.get<TaskTemplate>(`/task-templates/${id}`),

  create: (data: CreateTemplateRequest) =>
    api.post<TaskTemplate>('/task-templates', data),

  update: (id: string, data: Partial<CreateTemplateRequest>) =>
    api.patch<TaskTemplate>(`/task-templates/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/task-templates/${id}`),

  useTemplate: (id: string, data: UseTemplateRequest) =>
    api.post<UseTemplateResponse>(`/task-templates/${id}/use`, data),
};
