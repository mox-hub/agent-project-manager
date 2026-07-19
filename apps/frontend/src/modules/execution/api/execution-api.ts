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
  ExecutionRunListResponse,
  ApprovalRequestListResponse,
} from '@/shared/types/api';

// API 端点
const API_BASE = '/_api/execution';

export const executionApi = {
  // Execution Runs
  async listRuns(): Promise<ExecutionRun[]> {
    const res = await fetch(`${API_BASE}/runs`);
    if (!res.ok) throw new Error('Failed to fetch execution runs');
    const data: ExecutionRunListResponse = await res.json();
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
    const data: ExecutionRunListResponse = await res.json();
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

  // Approval Requests
  async listApprovals(status?: string): Promise<ApprovalRequest[]> {
    const url = status ? `${API_BASE}/approvals?status=${status}` : `${API_BASE}/approvals`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch approval requests');
    const data: ApprovalRequestListResponse = await res.json();
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
