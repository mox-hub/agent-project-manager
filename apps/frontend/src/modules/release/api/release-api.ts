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

/** 交付成果清单元素（CAP-K-03 批二）：交付了什么/在哪拿/怎么验证/限制/接收人 */
export interface ReleaseDeliverableItem {
  name: string;
  location: string;
  howToVerify: string;
  limitations?: string;
  receiver?: string;
}

/** 交付成果清单（Release.deliverables Json 列投影：items + 最后更新溯源） */
export interface ReleaseDeliverables {
  items: ReleaseDeliverableItem[];
  updatedBy?: string;
  updatedAt?: string;
}

/** 所属里程碑轻量投影（CAP-A-16 计划-交付轴） */
export interface ReleaseMilestoneSummary {
  id: string;
  name: string;
  status: string;
}

export interface ReleaseRecord {
  id: string;
  projectId: string;
  /** 所属项目摘要（后端 include 投影，绑定关系可读名展示用） */
  project?: { id: string; name: string } | null;
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
  deliverables?: ReleaseDeliverables | null;
  failureReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  tagPushed: boolean;
  githubReleased: boolean;
  milestoneId?: string | null;
  milestone?: ReleaseMilestoneSummary | null;
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
  milestoneId?: string | null;
}

export interface UpdateReleaseRequest {
  name?: string;
  notes?: string;
  version?: string;
  scopeIssueIds?: string[];
  milestoneId?: string | null;
}

export interface ApprovalProposal {
  id: string;
  kind: string;
  title: string;
  status: string;
}

export const releaseApi = {
  // projectId 缺省 = 全部项目（CAP-A-15：未聚焦时列表页仍请求）
  list: (projectId?: string) =>
    api.get<ReleaseRecord[]>('/releases', projectId ? { projectId } : undefined),
  detail: (id: string) => api.get<ReleaseRecord>(`/releases/${id}`),
  create: (data: CreateReleaseRequest) =>
    api.post<ReleaseRecord>('/releases', data),
  update: (id: string, data: UpdateReleaseRequest) =>
    api.patch<ReleaseRecord>(`/releases/${id}`, data),
  // 交付成果清单（CAP-K-03 批二）：全量替换，任意状态可改，服务端记录操作人
  updateDeliverables: (id: string, deliverables: ReleaseDeliverableItem[]) =>
    api.put<ReleaseRecord>(`/releases/${id}/deliverables`, { deliverables }),
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
