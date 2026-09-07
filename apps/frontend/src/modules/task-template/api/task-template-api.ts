import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO），响应体
 * 在服务端补 @ApiOkResponse 之前仍维持手写 interface。
 */
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

export type CreateTemplateRequest = RequestBodyOf<'IssueTemplateController_create'>;

export type UseTemplateRequest = RequestBodyOf<'IssueTemplateController_useTemplate'>;

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
    api.get<TaskTemplate[]>('/issue-templates', { projectId }),

  getById: (id: string) =>
    api.get<TaskTemplate>(`/issue-templates/${id}`),

  create: (data: CreateTemplateRequest) =>
    api.post<TaskTemplate>('/issue-templates', data),

  update: (id: string, data: Partial<CreateTemplateRequest>) =>
    api.patch<TaskTemplate>(`/issue-templates/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/issue-templates/${id}`),

  useTemplate: (id: string, data: UseTemplateRequest) =>
    api.post<UseTemplateResponse>(`/issue-templates/${id}/use`, data),
};
