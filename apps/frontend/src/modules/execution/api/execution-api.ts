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

export type { ExecutionRun, ExecutionStep };

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
  // Execution Runs
  async listRuns(): Promise<ExecutionRun[]> {
    const res = await fetch(`${API_BASE}/runs`);
    if (!res.ok) throw new Error('Failed to fetch execution runs');
    const data: { data: ExecutionRun[] } = await res.json();
    return data.data || [];
  },

  async getRun(id: string): Promise<ExecutionRun> {
    const res = await fetch(`${API_BASE}/runs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch execution run');
    const data = await res.json();
    return data.data;
  },

  async getRunByTask(taskId: string): Promise<ExecutionRun[]> {
    const res = await fetch(`${API_BASE}/runs/task/${taskId}`);
    if (!res.ok) throw new Error('Failed to fetch execution runs by task');
    const data: { data: ExecutionRun[] } = await res.json();
    return data.data || [];
  },

  async cancelRun(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/runs/${id}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel execution run');
  },

  async retryRun(id: string): Promise<ExecutionRun> {
    const res = await fetch(`${API_BASE}/runs/${id}/retry`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retry execution run');
    const data = await res.json();
    return data.data;
  },

  /**
   * 获取执行可用步骤（恢复流程用）
   */
  async getAvailableSteps(id: string): Promise<ExecutionStep[]> {
    const res = await fetch(`${API_BASE}/runs/${id}/steps`);
    if (!res.ok) throw new Error('Failed to fetch execution steps');
    const data = await res.json();
    return data.data || [];
  },

  /**
   * 重新执行（恢复流程用）
   */
  async retry(id: string): Promise<ExecutionRun> {
    return this.retryRun(id);
  },

  /**
   * 重试指定步骤（恢复流程用）
   */
  async retryStep(id: string, stepId: string): Promise<ExecutionRun> {
    const res = await fetch(`${API_BASE}/runs/${id}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId }),
    });
    if (!res.ok) throw new Error('Failed to retry execution step');
    const data = await res.json();
    return data.data;
  },

  /**
   * 调整执行参数后重试（恢复流程用）
   */
  async adjustParams(
    id: string,
    params: Record<string, unknown>,
  ): Promise<ExecutionRun> {
    const res = await fetch(`${API_BASE}/runs/${id}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params }),
    });
    if (!res.ok) throw new Error('Failed to adjust execution params');
    const data = await res.json();
    return data.data;
  },

  /**
   * 转交人工（恢复流程用）
   */
  async escalate(
    id: string,
    escalateTo: string,
    reason?: string,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/runs/${id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escalateTo, reason }),
    });
    if (!res.ok) throw new Error('Failed to escalate execution');
  },

  /**
   * 放弃执行（恢复流程用）
   */
  async abort(id: string, reason?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/runs/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to abort execution');
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

  async batchResolveApprovals(ids: string[], approve: boolean): Promise<void> {
    const res = await fetch(`${API_BASE}/approvals/batch-resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, approve }),
    });
    if (!res.ok) throw new Error('Failed to batch resolve approvals');
  },

  // Audit Logs (by traceId)
  async getAuditLogsByTrace(traceId: string): Promise<unknown[]> {
    const res = await fetch(`${API_BASE}/audit/trace/${traceId}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    const data = await res.json();
    return data.data || [];
  },
};
