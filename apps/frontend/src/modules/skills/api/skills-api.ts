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

export type UpdateSkillRequest = RequestBodyOf<'SkillsController_updateSkill'>;

export const skillsApi = {
  listSkills: () => api.get<{ skills: SkillStatus[] }>('/skills'),

  updateSkill: (key: string, data: UpdateSkillRequest) =>
    api.put<SkillStatus>(`/skills/${key}`, data),
};
