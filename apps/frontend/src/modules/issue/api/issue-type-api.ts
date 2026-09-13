import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO）；FieldSchemaDef
 * 与契约 FieldSchemaDefDto 逐字段一致，响应侧 IssueTypeMeta 仍维持手写。
 */

/** 字段类型（适配引擎 fieldSchema 九种：六基础 + boolean/member/url 随类型管理面扩展） */
export type FieldSchemaType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'date'
  | 'boolean'
  | 'member'
  | 'url';

/** 字段定义（fieldSchema 数组元素，与服务端 FieldSchemaDefDto 对齐） */
export interface FieldSchemaDef {
  key: string;
  label: string;
  type: FieldSchemaType;
  required?: boolean;
  /** select/multiselect 必须提供 */
  options?: string[];
  /** 缺省值（字符串口径；boolean 存 'true'/'false'，渲染层按类型转换） */
  defaultValue?: string;
  /** 字段用途描述 */
  description?: string;
  /** 字段级启用开关：false = 不出现在工单表单（既有值保留） */
  enabled?: boolean;
  order?: number;
}

/** 工单类型元数据（IssueType 适配引擎） */
export interface IssueTypeMeta {
  id: string;
  key: string;
  name: string;
  /** 类型描述（一句话用途说明；未配置为 null） */
  description?: string | null;
  icon: string;
  color: string;
  order: number;
  isSystem: boolean;
  /** 启用开关：禁用类型不在创建入口可选（默认类型 task 恒开） */
  enabled: boolean;
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
