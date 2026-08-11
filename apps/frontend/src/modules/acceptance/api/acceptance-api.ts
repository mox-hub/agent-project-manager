/**
 * Acceptance 模块 API client
 */
import { api } from '@/infrastructure/api-client';

export type CompletionType = 'pr' | 'test_report' | 'document' | 'artifact';

export interface CompletionEvidence {
  executionRunId?: string;
  capturedAt?: string;
  artifacts?: Array<{ id?: string; name?: string; type?: string; metadata?: Record<string, unknown> }>;
  report?: Record<string, unknown>;
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

export interface AcceptanceCriterion {
  id: string;
  criteriaType: string;
  content: string;
  status: 'pending' | 'passed' | 'failed' | 'waived';
  category?: string;
  severity?: string;
  evidence?: string;
}

export interface AuditItem {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  suggestion?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditReport {
  id: string;
  status: 'pending' | 'passed' | 'warning' | 'failed';
  generatedAt: string;
  items: AuditItem[];
  summary?: Record<string, unknown>;
}

export interface AcceptanceExecution {
  id: string;
  taskId?: string;
  agentId?: string;
  goal: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Acceptance {
  id: string;
  taskId: string;
  status: string; // draft | pending | in_review | passed | failed | waived
  completionType: CompletionType;
  completionEvidence: CompletionEvidence | null;
  rejectionReason?: string | null;
  completedAt?: string | null;
  rejectedAt?: string | null;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  criteria?: AcceptanceCriterion[];
  auditReport?: AuditReport | null;
  task?: { id: string; title: string; status: string; projectId?: string } | null;
  executions?: AcceptanceExecution[];
  totalCost?: number;
  totalTokens?: number;
}

export const acceptanceApi = {
  /**
   * 获取任务的所有 acceptance
   */
  async listByTask(taskId: string): Promise<Acceptance[]> {
    const res = await api.get<Acceptance[]>(`/acceptance/task/${taskId}`);
    return (Array.isArray(res) ? res : []) as Acceptance[];
  },

  /**
   * 获取单个 acceptance 详情
   */
  async findOne(id: string): Promise<Acceptance> {
    const res = await api.get<Acceptance>(`/acceptance/${id}`);
    return res as Acceptance;
  },

  /**
   * 校验完成证据（按契约类型）
   */
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

  /**
   * 接收完成 → status=passed
   */
  async acceptCompletion(
    id: string,
    evidence: Record<string, unknown>,
  ): Promise<Acceptance> {
    const res = await api.post<Acceptance>(
      `/acceptance/${id}/accept-completion`,
      { evidence },
    );
    return res as Acceptance;
  },

  /**
   * 驳回 → status=failed + 记录原因
   */
  async rejectCompletion(id: string, reason: string): Promise<Acceptance> {
    const res = await api.post<Acceptance>(
      `/acceptance/${id}/reject-completion`,
      { reason },
    );
    return res as Acceptance;
  },
};

/**
 * 全局 acceptance 列表查询 hook（暴露在 api 文件以便 acceptance-list-page 引用）
 * 接受 status 等筛选，返回分页结构 { items, meta }
 */
import { useQuery as _useQuery } from '@tanstack/react-query';
export function useAcceptanceList(params: {
  status?: string;
  taskId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return _useQuery<{ items: Acceptance[]; meta?: { page: number; pageSize: number; total: number; totalPages: number } }>({
    queryKey: ['acceptance', 'list', params],
    queryFn: async () => {
      const queryString = new URLSearchParams();
      if (params.status) queryString.set('status', params.status);
      if (params.taskId) queryString.set('taskId', params.taskId);
      if (params.projectId) queryString.set('projectId', params.projectId);
      if (params.page) queryString.set('page', String(params.page));
      if (params.pageSize) queryString.set('pageSize', String(params.pageSize));
      const url = `/acceptance${queryString.toString() ? '?' + queryString.toString() : ''}`;
      const data = await api.get<{ data: Acceptance[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }>(url);
      return { items: data.data ?? [], meta: data.meta };
    },
  });
}
