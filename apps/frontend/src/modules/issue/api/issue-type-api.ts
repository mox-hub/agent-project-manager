import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO）；FieldSchemaDef
 * 与契约 FieldSchemaDefDto 逐字段一致，响应侧 IssueTypeMeta 仍维持手写。
 */

/** 字段类型（适配引擎二期 fieldSchema 允许的六种） */
export type FieldSchemaType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'date';

/** 字段定义（fieldSchema 数组元素，与服务端 FieldSchemaDefDto 对齐） */
export interface FieldSchemaDef {
  key: string;
  label: string;
  type: FieldSchemaType;
  required?: boolean;
  /** select/multiselect 必须提供 */
  options?: string[];
  order?: number;
}

/** 工单类型元数据（IssueType 适配引擎） */
export interface IssueTypeMeta {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  isSystem: boolean;
  /** 字段定义（适配引擎二期），按 order 排序返回；未定义时为 null */
  fieldSchema?: FieldSchemaDef[] | null;
  /** withUsage=true 时返回的任务引用计数 */
  _count?: { tasks: number };
}

export type CreateIssueTypeRequest = RequestBodyOf<'IssueTypeController_create'>;

export type UpdateIssueTypeRequest = RequestBodyOf<'IssueTypeController_update'>;

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
