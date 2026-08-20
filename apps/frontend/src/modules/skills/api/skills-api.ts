/**
 * Skills API
 *
 * 与后端 apps/server/src/modules/skills/ 对应的 REST API
 */

import { api } from '@/infrastructure/api-client';

export interface SkillStatus {
  key: string;
  name: string;
  description?: string;
  category: string;
  source: 'builtin' | 'custom';
  enabled: boolean;
  updatedAt: string;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string;
  category?: string;
  enabled?: boolean;
}

export const skillsApi = {
  listSkills: () => api.get<{ skills: SkillStatus[] }>('/skills'),

  updateSkill: (key: string, data: UpdateSkillRequest) =>
    api.put<SkillStatus>(`/skills/${key}`, data),
};
