/**
 * Skills API
 *
 * 与后端 apps/server/src/modules/skills/ 对应的 REST API
 */

import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO），响应体
 * 在服务端补 @ApiOkResponse 之前仍维持手写 interface。
 */
export interface SkillStatus {
  key: string;
  name: string;
  description?: string;
  category: string;
  source: 'builtin' | 'custom';
  enabled: boolean;
  updatedAt: string;
}

/** GET /skills/:key 与 create/import 的返回：含指令正文与来源路径 */
export interface SkillDetail extends SkillStatus {
  content?: string;
  sourcePath?: string;
}

export type CreateSkillRequest = RequestBodyOf<'SkillsController_createSkill'>;
export type ImportSkillRequest = RequestBodyOf<'SkillsController_importSkill'>;
export type UpdateSkillRequest = RequestBodyOf<'SkillsController_updateSkill'>;

export const skillsApi = {
  listSkills: () => api.get<{ skills: SkillStatus[] }>('/skills'),

  getSkill: (key: string) => api.get<SkillDetail>(`/skills/${key}`),

  createSkill: (data: CreateSkillRequest) =>
    api.post<SkillDetail>('/skills', data),

  importSkill: (data: ImportSkillRequest) =>
    api.post<SkillDetail>('/skills/import', data),

  updateSkill: (key: string, data: UpdateSkillRequest) =>
    api.put<SkillStatus>(`/skills/${key}`, data),

  removeSkill: (key: string) =>
    api.delete<{ key: string; deleted: boolean }>(`/skills/${key}`),
};
