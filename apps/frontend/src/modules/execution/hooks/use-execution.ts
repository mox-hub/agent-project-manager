/**
 * Execution Module Hooks
 * 
 * TanStack Query hooks for execution module
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executionApi } from '../api/execution-api';
import type { ApprovalAction } from '@/shared/types/api';

// Query Keys
export const executionKeys = {
  all: ['execution'] as const,
  runs: () => [...executionKeys.all, 'runs'] as const,
  run: (id: string) => [...executionKeys.runs(), id] as const,
  runsByTask: (taskId: string) => [...executionKeys.runs(), 'task', taskId] as const,
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

export function useExecutionRunsByTask(taskId: string) {
  return useQuery({
    queryKey: executionKeys.runsByTask(taskId),
    queryFn: () => executionApi.getRunByTask(taskId),
    enabled: !!taskId,
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
