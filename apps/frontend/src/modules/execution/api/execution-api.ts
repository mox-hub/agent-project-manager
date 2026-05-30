import { api } from '@/infrastructure/api-client';

export type RecoveryAction =
  | 'retry'
  | 'retry_step'
  | 'adjust_params'
  | 'escalate'
  | 'abort';

export interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionRun {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  steps: ExecutionStep[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount?: number;
}

export interface RecoveryOptions {
  action: RecoveryAction;
  targetStepId?: string;
  adjustedParams?: Record<string, unknown>;
  escalateTo?: string;
  reason?: string;
}

export const executionApi = {
  getRun: (taskId: string) =>
    api.get<ExecutionRun>(`/ai-hub/executions/runs/${taskId}`),

  retry: (taskId: string) =>
    api.post<ExecutionRun>(`/ai-hub/executions/runs/${taskId}/retry`),

  retryStep: (taskId: string, stepId: string) =>
    api.post<ExecutionRun>(`/ai-hub/executions/runs/${taskId}/steps/${stepId}/retry`),

  adjustParams: (taskId: string, params: Record<string, unknown>) =>
    api.post<ExecutionRun>(`/ai-hub/executions/runs/${taskId}/adjust-params`, { params }),

  escalate: (taskId: string, escalateTo: string, reason?: string) =>
    api.post<ExecutionRun>(`/ai-hub/executions/runs/${taskId}/escalate`, { escalateTo, reason }),

  abort: (taskId: string, reason?: string) =>
    api.post<ExecutionRun>(`/ai-hub/executions/runs/${taskId}/abort`, { reason }),

  getAvailableSteps: (taskId: string) =>
    api.get<ExecutionStep[]>(`/ai-hub/executions/runs/${taskId}/steps`),
};
