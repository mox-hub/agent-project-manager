import { api } from '@/infrastructure/api-client';

/**
 * 项目档案（v2 纪要切片 1）数据层：响应类型与 server ProfileController 的
 * DTO 形状一一对应；请求体类型可从 generated 契约（ApiSchemas）单源引用，
 * 此处保持手写以贴近 project-api 既有惯例。
 */

export type ProfileSlot =
  | 'tech-stack'
  | 'module-map'
  | 'conventions'
  | 'risks'
  | 'tech-debts';

export type ProfileLifecycle = 'working' | 'consolidated' | 'archived' | 'pruned';

export interface ProfileAtom {
  id: string;
  slot: string;
  type: string;
  content: string;
  confidence: number;
  lifecycle: ProfileLifecycle;
  sourceType?: 'manual' | 'tool' | 'digest';
  sourceEventId?: string;
  pinned: boolean;
  supersededById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileSlotGroup {
  slot: ProfileSlot;
  label: string;
  description: string;
  filled: boolean;
  atoms: ProfileAtom[];
  drafts: ProfileAtom[];
  lastRefreshedAt?: string;
}

export interface ProfileResponse {
  projectId: string;
  slots: ProfileSlotGroup[];
  completeness: { filled: number; total: number };
}

export interface ProfileSchemaSlot {
  key: string;
  label: string;
  description: string;
  atomType: string;
}

export interface ProfileSchemaResponse {
  version: string;
  slots: ProfileSchemaSlot[];
}

export interface CreateProfileAtomInput {
  projectId: string;
  slot: ProfileSlot;
  content: string;
  confidence?: number;
  refs?: Array<{ kind: string; id: string }>;
}

export interface ArchaeologyStartResponse {
  issueId: string;
  executionId: string;
  auditWarning?: string;
}

export interface ArchaeologyIngestResponse {
  created: number;
  skipped: number;
  atoms: ProfileAtom[];
  summary?: string;
}

export interface ProfileBriefing {
  projectId: string;
  completeness: { filled: number; total: number };
  facts: {
    issues: { total: number; active: number };
    runningExecutions: number;
    recentActivities: Array<{ type: string; summary?: string; at: string }>;
  };
  atoms: ProfileAtom[];
}

export const profileApi = {
  getSchema: () => api.get<ProfileSchemaResponse>(`/projects/profile/schema`),

  getProfile: (projectId: string) =>
    api.get<ProfileResponse>(`/projects/${projectId}/profile`),

  createAtom: (data: CreateProfileAtomInput) =>
    api.post<ProfileAtom>(`/projects/${data.projectId}/profile/atoms`, data),

  editAtom: (projectId: string, atomId: string, content: string) =>
    api.patch<ProfileAtom>(`/projects/${projectId}/profile/atoms/${atomId}`, {
      content,
    }),

  approveAtom: (projectId: string, atomId: string) =>
    api.post<ProfileAtom>(
      `/projects/${projectId}/profile/atoms/${atomId}/approve`,
      {},
    ),

  rejectAtom: (projectId: string, atomId: string, reason?: string) =>
    api.post<ProfileAtom>(
      `/projects/${projectId}/profile/atoms/${atomId}/reject`,
      { reason },
    ),

  deleteAtom: (projectId: string, atomId: string) =>
    api.delete<ProfileAtom>(`/projects/${projectId}/profile/atoms/${atomId}`),

  startArchaeology: (
    projectId: string,
    data: { memberId?: string; providerId?: string } = {},
  ) =>
    api.post<ArchaeologyStartResponse>(
      `/projects/${projectId}/profile/archaeology`,
      data,
    ),

  ingestArchaeology: (projectId: string, executionId: string) =>
    api.post<ArchaeologyIngestResponse>(
      `/projects/${projectId}/profile/archaeology/${executionId}/ingest`,
      {},
    ),

  getBriefing: (projectId: string) =>
    api.get<ProfileBriefing>(`/projects/${projectId}/briefing`),
};
