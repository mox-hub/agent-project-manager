/**
 * 执行模块 API
 * 提供 AI 执行运行的相关数据访问
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import type { PaginatedData } from '@/shared/types/api';

export type ExecStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionRun {
  id: string;
  taskId: string;
  taskTitle?: string;
  projectId: string;
  projectName?: string;
  agentId: string;
  agentName: string;
  status: ExecStatus;
  title: string;
  startedAt: string;
  endedAt?: string;
  duration?: string;
  cost: number;
  tokensUsed: number;
  stepsCompleted: number;
  stepsTotal: number;
  output?: string;
  errorMessage?: string;
  acceptanceId?: string;
  acceptanceTitle?: string;
}

export interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  taskTitle?: string;
  agentId: string;
  agentName: string;
  action: string;
  riskLevel: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  evaluatedAt?: string;
  evaluatorId?: string;
  evaluation?: string;
}

export interface AgentTrustProfile {
  agentId: string;
  agentName: string;
  trustLevel: 0 | 1 | 2 | 3;
  trustScore: number;
  recentEvaluations: EvaluationRecord[];
}

export interface EvaluationRecord {
  id: string;
  taskTitle: string;
  score: number;
  timestamp: string;
}

// TanStack Query Hooks
export function useExecutionRuns(params?: {
  status?: ExecStatus | 'all';
  agentId?: string;
  projectId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['executions', 'runs', params],
    queryFn: async () => executionApi.list(params),
  });
}

export function useExecutionDetail(id: string) {
  return useQuery({
    queryKey: ['executions', 'run', id],
    queryFn: () => executionApi.get(id),
    enabled: !!id,
  });
}

export function useApprovalRequests() {
  return useQuery({
    queryKey: ['executions', 'approvals'],
    queryFn: async (): Promise<PaginatedData<ApprovalRequest>> => {
      return api.getPaginated<ApprovalRequest>('/acceptance/approval-requests');
    },
  });
}

export function useAgentTrustProfiles() {
  return useQuery({
    queryKey: ['executions', 'trust-profiles'],
    queryFn: async (): Promise<AgentTrustProfile[]> => {
      return api.get<AgentTrustProfile[]>('/ai/trust-profiles');
    },
  });
}

// API Functions
export const executionApi = {
  list: (params?: {
    status?: ExecStatus | 'all';
    agentId?: string;
    projectId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedData<ExecutionRun>> => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    return api.getPaginated<ExecutionRun>(`/acceptance/executions?${searchParams.toString()}`);
  },

  get: (id: string): Promise<ExecutionRun> => {
    return api.get<ExecutionRun>(`/acceptance/executions/${id}`);
  },

  getSteps: (id: string): Promise<ExecutionStep[]> => {
    return api.get<ExecutionStep[]>(`/acceptance/executions/${id}/steps`);
  },

  retry: (id: string): Promise<ExecutionRun> => {
    return api.post<ExecutionRun>(`/acceptance/executions/${id}/retry`, {});
  },

  cancel: (id: string): Promise<void> => {
    return api.post<void>(`/acceptance/executions/${id}/cancel`, {});
  },
};
