import { api } from '@/infrastructure/api-client';

/** 工单类型元数据（IssueType 适配引擎） */
export interface IssueTypeMeta {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  isSystem: boolean;
  /** withUsage=true 时返回的任务引用计数 */
  _count?: { tasks: number };
}

export interface CreateIssueTypeRequest {
  key: string;
  name: string;
  icon?: string;
  color?: string;
  order?: number;
}

export interface UpdateIssueTypeRequest {
  name?: string;
  icon?: string;
  color?: string;
  order?: number;
}

export const issueTypeApi = {
  /** 类型列表（适配引擎元数据源） */
  async list(withUsage = false): Promise<IssueTypeMeta[]> {
    return api.get<IssueTypeMeta[]>(
      `/issue-types${withUsage ? '?withUsage=true' : ''}`,
    );
  },

  async create(data: CreateIssueTypeRequest): Promise<IssueTypeMeta> {
    return api.post<IssueTypeMeta>('/issue-types', data);
  },

  async update(id: string, data: UpdateIssueTypeRequest): Promise<IssueTypeMeta> {
    return api.patch<IssueTypeMeta>(`/issue-types/${id}`, data);
  },

  async remove(id: string): Promise<void> {
    return api.delete<void>(`/issue-types/${id}`);
  },
};
