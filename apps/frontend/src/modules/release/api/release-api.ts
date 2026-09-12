/**
 * Release API——与后端 apps/server/src/modules/release/ 对应的 REST 面。
 * 响应形状对齐 openapi 契约（ReleaseDto / GateResultDto 族）。
 */

import { api } from '@/infrastructure/api-client';

export type ReleaseStatus =
  | 'draft'
  | 'gated'
  | 'approved'
  | 'publishing'
  | 'released'
  | 'failed';

export interface GateCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface GateResult {
  passed: boolean;
  ranAt: string;
  checks: GateCheck[];
}

export interface ExecutionStep {
  step: string;
  status: 'ok' | 'skipped' | 'failed';
  detail: string;
  at: string;
}

export interface ReleaseScope {
  issueIds?: string[];
}

export interface ReleaseRecord {
  id: string;
  projectId: string;
  version: string;
  name?: string | null;
  notes?: string | null;
  status: ReleaseStatus;
  gitTag?: string | null;
  releasedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  scope?: ReleaseScope | null;
  gateResult?: GateResult | null;
  executionLog?: ExecutionStep[] | null;
  failureReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  tagPushed: boolean;
  githubReleased: boolean;
}

export interface VersionRecommendation {
  recommended: string;
  base: string;
  releaseType: 'major' | 'minor' | 'patch';
  basis: string;
}

export interface CreateReleaseRequest {
  projectId: string;
  version: string;
  name?: string;
  notes?: string;
  scopeIssueIds?: string[];
}

export interface UpdateReleaseRequest {
  name?: string;
  notes?: string;
  version?: string;
  scopeIssueIds?: string[];
}

export interface ApprovalProposal {
  id: string;
  kind: string;
  title: string;
  status: string;
}

export const releaseApi = {
  list: (projectId: string) =>
    api.get<ReleaseRecord[]>('/releases', { projectId }),
  detail: (id: string) => api.get<ReleaseRecord>(`/releases/${id}`),
  create: (data: CreateReleaseRequest) =>
    api.post<ReleaseRecord>('/releases', data),
  update: (id: string, data: UpdateReleaseRequest) =>
    api.patch<ReleaseRecord>(`/releases/${id}`, data),
  recommendVersion: (projectId: string, excludeReleaseId?: string) =>
    api.get<VersionRecommendation>('/releases/version-recommend', {
      projectId,
      excludeReleaseId,
    }),
  gate: (id: string) =>
    api.post<GateResult>(`/releases/${id}/gate`),
  approvalRequest: (id: string) =>
    api.post<ApprovalProposal>(`/releases/${id}/approval-request`, {}),
  publish: (id: string) =>
    api.post<ReleaseRecord>(`/releases/${id}/publish`),
  reject: (id: string, reason?: string) =>
    api.post<ReleaseRecord>(`/releases/${id}/reject`, { reason }),
  reopen: (id: string) => api.post<ReleaseRecord>(`/releases/${id}/reopen`),
};
