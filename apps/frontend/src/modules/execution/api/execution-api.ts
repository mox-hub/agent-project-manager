/**
 * Execution Module API - TanStack Query Hooks
 * 
 * Phase 1 完成度: 基础结构已创建
 * 待完善: 与后端API的实际连接
 */

import type {
  ExecutionRun,
  ExecutionStep,
  ApprovalRequest,
  ApprovalAction,
} from '@/shared/types/api';
import { api } from '@/infrastructure/api-client';

export type { ExecutionRun, ExecutionStep };

// ─── 4d: Issue 统一执行项（人工/AI 共用，八态状态机） ───────────────

export type ExecutionStatus =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'superseded';

export interface IssueExecution {
  id: string;
  projectId: string;
  issueId?: string | null;
  subjectType: 'human' | 'platform_ai_member' | 'external_agent' | string;
  subjectId?: string | null;
  goal: string;
  title?: string | null;
  description?: string | null;
  status: ExecutionStatus;
  /** 预估工时（分钟） */
  estimate?: number | null;
  /** 实际工时（分钟） */
  actualSpent?: number | null;
  order?: number;
  metadata?: Record<string, unknown> | null;
  acceptanceId?: string | null;
  /** 兜底批 5：重试血缘——本执行由哪个失败/阻塞执行重新执行而来 */
  retryOfId?: string | null;
  /** 审计闸门黄牌提示（人工执行项 + 活契约审计 red 时返回） */
  auditWarning?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  approvals?: Array<{
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    actionType?: string;
    createdAt?: string;
  }>;
}

export interface CreateIssueExecutionRequest {
  /** 人工执行项固定传 'human'；缺省走既有 AI 派发流 */
  subjectType: 'human';
  title: string;
  description?: string;
  /** 执行人 Member.id */
  subjectId: string;
  /** 预估工时（分钟） */
  estimate?: number;
  order?: number;
  /** 协作人 Member.id 列表 */
  collaborators?: string[];
}

export interface UpdateExecutionRequest {
  status?: ExecutionStatus;
  title?: string;
  description?: string;
  /** 预估工时（分钟） */
  estimate?: number;
  /** 实际工时（分钟） */
  actualSpent?: number;
  order?: number;
  metadata?: Record<string, unknown>;
}

export type RecoveryAction =
  | 'retry'
  | 'retry_step'
  | 'adjust_params'
  | 'escalate'
  | 'abort';

export interface RecoveryOptions {
  stepId?: string;
  params?: Record<string, unknown>;
  escalateTo?: string;
  reason?: string;
}

// API 端点
const API_BASE = '/_api/execution';

export const executionApi = {
  // 兜底改造批 4：老 fetch 版 run 方法（listRuns/getRun/retry/escalate 等）
  // 指向后端不存在或无鉴权的路由，已删除；重试走 ai-hub dispatchTaskToCli
  // 绑定执行项通路，run 查询走 modules/executions 的 /execution/runs hooks。

  // ─── 4d: Issue 统一执行项 ──────────────────────────────────────

  /** 列出 issue 下执行项（含待审批 approvals） */
  async listIssueExecutions(issueId: string): Promise<IssueExecution[]> {
    return api.get<IssueExecution[]>(`/issues/${issueId}/executions`);
  },

  /** 创建人工执行项（初始 draft） */
  async createIssueExecution(
    issueId: string,
    data: CreateIssueExecutionRequest,
  ): Promise<IssueExecution> {
    return api.post<IssueExecution>(`/issues/${issueId}/executions`, data);
  },

  /** 更新执行项（状态流转 / estimate / actualSpent 编辑） */
  async updateExecution(
    id: string,
    data: UpdateExecutionRequest,
  ): Promise<IssueExecution> {
    return api.patch<IssueExecution>(`/execution/runs/${id}`, data);
  },

  // Approval Requests
  async listApprovals(status?: string): Promise<ApprovalRequest[]> {
    const url = status ? `${API_BASE}/approvals?status=${status}` : `${API_BASE}/approvals`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch approval requests');
    const data: { data: ApprovalRequest[] } = await res.json();
    return data.data || [];
  },

  async getApproval(id: string): Promise<ApprovalRequest> {
    const res = await fetch(`${API_BASE}/approvals/${id}`);
    if (!res.ok) throw new Error('Failed to fetch approval request');
    const data = await res.json();
    return data.data;
  },

  async resolveApproval(id: string, action: ApprovalAction): Promise<void> {
    const res = await fetch(`${API_BASE}/approvals/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!res.ok) throw new Error('Failed to resolve approval');
  },


  // Audit Logs (by traceId)
  async getAuditLogsByTrace(traceId: string): Promise<unknown[]> {
    const res = await fetch(`${API_BASE}/audit/trace/${traceId}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    const data = await res.json();
    return data.data || [];
  },
};
