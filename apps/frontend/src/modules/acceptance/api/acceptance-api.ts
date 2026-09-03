/**
 * Acceptance 模块 API client
 * 类型与服务端 acceptance 模块实际返回对齐（riskLevel/blockedItems、criteria blocked 等）
 */
import { api } from '@/infrastructure/api-client';
import { ApiClientError } from '@/shared/types/api';

export type CompletionType = 'pr' | 'test_report' | 'document' | 'artifact';
export type AcceptanceStatus =
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'passed'
  | 'failed'
  | 'waived';
export type CriterionStatus = 'pending' | 'passed' | 'failed' | 'blocked';

export interface CompletionEvidence {
  executionRunId?: string;
  capturedAt?: string;
  artifacts?: Array<{
    id?: string;
    name?: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }>;
  report?: Record<string, unknown>;
  autoChecks?: {
    kind: string;
    valid: boolean;
    passed: number;
    failed: number;
    errored?: number;
    total: number;
    checkedAt: string;
  };
  prUrl?: string;
  state?: string;
  filePaths?: string[];
  previousEvidence?: CompletionEvidence;
}

export interface AcceptanceCheck {
  name: string;
  ok: boolean;
  reason?: string;
}

/** 接收聚合校验失败项（服务端 ACCEPT_BLOCKED / TASK_DONE_BLOCKED 返回） */
export interface AcceptanceFailure {
  check: string;
  reason: string;
}

export interface CriterionEvidence {
  id: string;
  criteriaId: string;
  evidenceType: string;
  content?: string | null;
  storageRef?: string | null;
  submittedBy: string;
  createdAt: string;
}

export interface AcceptanceCriterion {
  id: string;
  acceptanceId: string;
  criteriaType: 'functional' | 'technical';
  content: string;
  status: CriterionStatus;
  category?: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source?: string;
  weight?: number;
  order: number;
  passedAt?: string | null;
  evidences?: CriterionEvidence[];
}

export interface AuditItem {
  id: string;
  type: string;
  content: string;
  category?: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface AuditReport {
  id: string;
  acceptanceId: string;
  riskLevel: 'red' | 'yellow' | 'green';
  blockedItems: AuditItem[];
  suggestedItems: AuditItem[];
  passedItems: AuditItem[];
  summary?: string | null;
  auditDate: string;
  checklist?: { id: string; name: string; techStack?: string } | null;
}

export interface AcceptanceExecution {
  id: string;
  goal?: string;
  status: string;
  totalCost?: number | null;
  totalTokens?: number | null;
  createdAt?: string;
  completedAt?: string | null;
}

export interface Acceptance {
  id: string;
  taskId: string;
  status: AcceptanceStatus;
  completionType: CompletionType;
  completionEvidence: CompletionEvidence | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  waiverReason?: string | null;
  waivedAt?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  title?: string | null;
  description?: string | null;
  type?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
  criteria?: AcceptanceCriterion[];
  auditReport?: AuditReport | null;
  task?: {
    id: string;
    title: string;
    status: string;
    projectId?: string | null;
    project?: { id: string; name: string } | null;
  } | null;
  executions?: AcceptanceExecution[];
  totalCost?: number | null;
  totalTokens?: number | null;
}

export interface CreateAcceptancePayload {
  taskId: string;
  title?: string;
  description?: string;
  completionType?: CompletionType;
  priority?: string;
  criteria?: Array<{
    criteriaType: 'functional' | 'technical';
    content: string;
    category?: string;
    severity?: string;
  }>;
}

/**
 * 从 ApiClientError 提取接收聚合校验失败清单（服务端 failures 可能落在 details 或顶层）
 */
export function extractFailures(err: unknown): AcceptanceFailure[] | null {
  if (!(err instanceof ApiClientError)) return null;
  const d = err.details as Record<string, unknown> | undefined;
  const candidates = [d?.failures, (err as unknown as Record<string, unknown>).failures, d];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0 && typeof c[0] === 'object' && c[0] !== null && 'reason' in (c[0] as object)) {
      return c as AcceptanceFailure[];
    }
  }
  return null;
}

/** 活契约判定：非终态即为活（draft/pending/in_review） */
export function isActiveAcceptance(a: Acceptance): boolean {
  return !['passed', 'failed', 'waived'].includes(a.status);
}

export const acceptanceApi = {
  /** 获取任务的所有 acceptance */
  async listByTask(taskId: string): Promise<Acceptance[]> {
    const res = await api.get<Acceptance[]>(`/acceptance/task/${taskId}`);
    return (Array.isArray(res) ? res : []) as Acceptance[];
  },

  /** 获取单个 acceptance 详情 */
  async findOne(id: string): Promise<Acceptance> {
    return (await api.get<Acceptance>(`/acceptance/${id}`)) as Acceptance;
  },

  /** 列表查询（分页） */
  async list(params: {
    status?: string;
    taskId?: string;
    projectId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: Acceptance[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.taskId) qs.set('taskId', params.taskId);
    if (params.projectId) qs.set('projectId', params.projectId);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const url = `/acceptance${qs.toString() ? `?${qs.toString()}` : ''}`;
    const data = await api.get<{
      data: Acceptance[];
      meta: { page: number; pageSize: number; total: number; totalPages: number };
    }>(url);
    return { items: data.data ?? [], meta: data.meta };
  },

  /** 创建验收契约（completionType 留空由服务端按任务推断） */
  async create(payload: CreateAcceptancePayload, userId?: string): Promise<Acceptance> {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return (await api.post<Acceptance>(`/acceptance${qs}`, payload)) as Acceptance;
  },

  /** 更新元数据（终态须经专用端点） */
  async update(id: string, patch: { title?: string; description?: string; priority?: string; status?: 'draft' | 'pending' | 'in_review' }): Promise<Acceptance> {
    return (await api.patch<Acceptance>(`/acceptance/${id}`, patch)) as Acceptance;
  },

  /** 删除验收契约（级联删除标准/证据/审计报告） */
  async remove(id: string): Promise<void> {
    await api.delete(`/acceptance/${id}`);
  },

  /** 校验完成证据（按契约类型，不落库） */
  async validateCompletion(
    id: string,
    evidence: Record<string, unknown>,
  ): Promise<{ valid: boolean; checks: AcceptanceCheck[] }> {
    const res = await api.post<{ valid: boolean; checks: AcceptanceCheck[] }>(
      `/acceptance/${id}/validate-completion`,
      { evidence },
    );
    return res ?? { valid: false, checks: [] };
  },

  /** 接收完成（聚合校验；evidence 可省略，使用 dispatch 回写快照） */
  async acceptCompletion(id: string, evidence?: Record<string, unknown>, userId?: string): Promise<Acceptance> {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return (await api.post<Acceptance>(`/acceptance/${id}/accept-completion${qs}`, {
      evidence: evidence ?? undefined,
    })) as Acceptance;
  },

  /** 驳回 → status=failed + 原因 */
  async rejectCompletion(id: string, reason: string, userId?: string): Promise<Acceptance> {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return (await api.post<Acceptance>(`/acceptance/${id}/reject-completion${qs}`, { reason })) as Acceptance;
  },

  /** 豁免 → status=waived（reason 必填） */
  async waiveCompletion(id: string, reason: string, userId?: string): Promise<Acceptance> {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return (await api.post<Acceptance>(`/acceptance/${id}/waive${qs}`, { reason })) as Acceptance;
  },

  /** 添加验收标准 */
  async addCriterion(
    acceptanceId: string,
    dto: { criteriaType: 'functional' | 'technical'; content: string; category?: string; severity?: string },
  ): Promise<AcceptanceCriterion> {
    return (await api.post<AcceptanceCriterion>(`/acceptance/${acceptanceId}/criteria`, dto)) as AcceptanceCriterion;
  },

  /** 删除验收标准 */
  async deleteCriterion(criteriaId: string): Promise<void> {
    await api.delete(`/acceptance/criteria/${criteriaId}`);
  },

  /** 更新验收标准（状态判定自动落 human_approval 证据） */
  async updateCriterion(
    criteriaId: string,
    data: { content?: string; status?: CriterionStatus; severity?: string; order?: number },
    userId?: string,
  ): Promise<AcceptanceCriterion> {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return (await api.patch<AcceptanceCriterion>(`/acceptance/criteria/${criteriaId}${qs}`, data)) as AcceptanceCriterion;
  },
};
