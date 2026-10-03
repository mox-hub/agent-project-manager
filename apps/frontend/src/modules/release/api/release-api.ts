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

/**
 * 发布平台封闭枚举（CAP-K-03 批三，与 server dto RELEASE_PLATFORM_VALUES 镜像）。
 * 平台名为专有名词不做 i18n，展示直接用 label。
 */
export const RELEASE_PLATFORMS = [
  'android',
  'ios',
  'windows',
  'macos',
  'linux',
  'web',
] as const;
export type ReleasePlatform = (typeof RELEASE_PLATFORMS)[number];

export const RELEASE_PLATFORM_LABELS: Record<ReleasePlatform, string> = {
  android: 'Android',
  ios: 'iOS',
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  web: 'Web',
};

/** 版本通道（semver 预发布后缀推导；与 server release-version.service 镜像） */
export type ReleaseChannel = 'stable' | 'alpha' | 'beta' | 'rc';

export function deriveReleaseChannel(version: string): ReleaseChannel {
  const m = version.match(
    /-[._-]?(alpha|beta|rc)\b/i,
  ) as RegExpMatchArray | null;
  if (!m) return 'stable';
  const head = m[1].toLowerCase();
  if (head === 'alpha') return 'alpha';
  if (head === 'beta') return 'beta';
  if (head === 'rc') return 'rc';
  return 'stable';
}

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
  /** 所属发布平台（批三；产物为全端时省略） */
  platform?: string;
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

/** 热修基线轻量投影（批三血缘：详情「修复自 vX.Y.Z」徽标数据源） */
export interface ReleaseHotfixOf {
  id: string;
  version: string;
  name?: string | null;
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
  /** 计划发版时间（批三；挂里程碑时由 targetDate 预填） */
  plannedAt?: string | null;
  /** 发布平台（批三；封闭枚举数组） */
  platforms?: string[] | null;
  /** 升级/迁移注意事项（批三；major 版本门禁注记要求） */
  upgradeNotes?: string | null;
  /** 热修基线发版 ID（批三） */
  hotfixOfId?: string | null;
  hotfixOf?: ReleaseHotfixOf | null;
  /** 门禁未过检查项计数（批四列表卡点投影；未跑过门禁为 null；列表接口专属） */
  gateFailedChecks?: number | null;
  /** 是否有待审批发布决策卡（批四列表卡点投影；列表接口专属） */
  hasPendingApproval?: boolean;
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
  plannedAt?: string | null;
  platforms?: string[] | null;
  upgradeNotes?: string;
  hotfixOfId?: string | null;
}

export interface UpdateReleaseRequest {
  name?: string;
  notes?: string;
  version?: string;
  scopeIssueIds?: string[];
  milestoneId?: string | null;
  plannedAt?: string | null;
  platforms?: string[] | null;
  upgradeNotes?: string;
  hotfixOfId?: string | null;
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
  // CHANGELOG 再生文本预览（批四：只读不写文件）
  changelogPreview: (id: string) =>
    api.get<{
      releaseId: string;
      projectId: string;
      version: string;
      content: string;
    }>(`/releases/${id}/changelog-preview`),
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
