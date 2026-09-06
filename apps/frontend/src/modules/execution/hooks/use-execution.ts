/**
 * Execution Module Hooks
 * 
 * TanStack Query hooks for execution module
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  executionApi,
  type CreateIssueExecutionRequest,
  type UpdateExecutionRequest,
} from '../api/execution-api';
import type { ApprovalAction } from '@/shared/types/api';

// Query Keys
export const executionKeys = {
  all: ['execution'] as const,
  runs: () => [...executionKeys.all, 'runs'] as const,
  run: (id: string) => [...executionKeys.runs(), id] as const,
  runsByTask: (issueId: string) => [...executionKeys.runs(), 'task', issueId] as const,
  issueExecutions: (issueId: string) =>
    [...executionKeys.all, 'issueExecutions', issueId] as const,
  approvals: (status?: string) => [...executionKeys.all, 'approvals', status] as const,
  approval: (id: string) => [...executionKeys.approvals(), id] as const,
  auditLogs: (traceId: string) => [...executionKeys.all, 'audit', traceId] as const,
};

// Hooks for Execution Runs
export function useExecutionRuns() {
  return useQuery({
    queryKey: executionKeys.runs(),
    queryFn: () => executionApi.listRuns(),
    refetchInterval: 5000, // Auto-refresh every 5s for running executions
  });
}

export function useExecutionRun(id: string) {
  return useQuery({
    queryKey: executionKeys.run(id),
    queryFn: () => executionApi.getRun(id),
    enabled: !!id,
  });
}

export function useExecutionRunsByTask(issueId: string) {
  return useQuery({
    queryKey: executionKeys.runsByTask(issueId),
    queryFn: () => executionApi.getRunByTask(issueId),
    enabled: !!issueId,
  });
}

export function useCancelExecutionRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => executionApi.cancelRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.runs() });
    },
  });
}

export function useRetryExecutionRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => executionApi.retryRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.runs() });
    },
  });
}

// ─── 4d: Issue 统一执行项（人工/AI 共用） ──────────────────────────

/** issue 执行项列表（含待审批） */
export function useIssueExecutions(issueId: string | undefined) {
  return useQuery({
    queryKey: executionKeys.issueExecutions(issueId ?? ''),
    queryFn: () => executionApi.listIssueExecutions(issueId!),
    enabled: !!issueId,
  });
}

/** 执行项变更后统一失效：执行项列表 + 旧 taskExecutions + issue 详情 */
function invalidateExecutionScopes(
  queryClient: ReturnType<typeof useQueryClient>,
  issueId: string,
) {
  queryClient.invalidateQueries({
    queryKey: executionKeys.issueExecutions(issueId),
  });
  // 旧 AI 派发流消费方（task-detail-drawer 等）仍读 taskExecutions
  queryClient.invalidateQueries({ queryKey: ['taskExecutions', issueId] });
  queryClient.invalidateQueries({ queryKey: ['task', issueId] });
}

export function useCreateIssueExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { issueId: string; data: CreateIssueExecutionRequest }) =>
      executionApi.createIssueExecution(variables.issueId, variables.data),
    onSuccess: (_, variables) => {
      invalidateExecutionScopes(queryClient, variables.issueId);
    },
    onError: (err) => {
      toast.error('创建执行项失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useUpdateExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; issueId: string; data: UpdateExecutionRequest }) =>
      executionApi.updateExecution(variables.id, variables.data),
    onSuccess: (_, variables) => {
      invalidateExecutionScopes(queryClient, variables.issueId);
    },
    onError: (err) => {
      toast.error('更新执行项失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

// Hooks for Approval Requests
export function useApprovalRequests(status?: string) {
  return useQuery({
    queryKey: executionKeys.approvals(status),
    queryFn: () => executionApi.listApprovals(status),
    refetchInterval: 10000, // Auto-refresh every 10s
  });
}

export function useApprovalRequest(id: string) {
  return useQuery({
    queryKey: executionKeys.approval(id),
    queryFn: () => executionApi.getApproval(id),
    enabled: !!id,
  });
}

export function useResolveApproval() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: ApprovalAction }) =>
      executionApi.resolveApproval(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.approvals() });
    },
  });
}

export function useBatchResolveApprovals() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ids, approve }: { ids: string[]; approve: boolean }) =>
      executionApi.batchResolveApprovals(ids, approve),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.approvals() });
    },
  });
}

// Hooks for Audit Logs
export function useExecutionAuditLogs(traceId: string) {
  return useQuery({
    queryKey: executionKeys.auditLogs(traceId),
    queryFn: () => executionApi.getAuditLogsByTrace(traceId),
    enabled: !!traceId,
  });
}
