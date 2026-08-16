import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';
import type {
  AIWorkflow,
  RunWorkflowRequest,
  RunWorkflowResponse,
} from '../api/ai-hub-api';
import { eventClient } from '@/infrastructure/event-client';
import type { SocketEventMap } from '@/shared/types/socket-events';

export function useAIWorkflows() {
  return useQuery({
    queryKey: ['aiWorkflows'],
    queryFn: () => aiHubApi.getWorkflows(),
  });
}

export function useAIWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ['aiWorkflow', id],
    enabled: !!id,
    queryFn: () => aiHubApi.getWorkflow(id!),
  });
}

export function useRunAIWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      data,
    }: {
      workflowId: string;
      data: RunWorkflowRequest;
    }) => aiHubApi.runWorkflow(workflowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiWorkflowRuns'] });
    },
  });
}

interface AIWorkflowUpdateData {
  workflowRunId: string;
  stepId?: string;
  status: string;
  output?: Record<string, unknown>;
  error?: Error | string;
}

export function useAIWorkflowUpdates(
  workflowRunId: string | undefined,
  onUpdate: (data: AIWorkflowUpdateData) => void,
) {
  if (!workflowRunId) {
    return { subscribe: () => {}, unsubscribe: () => {} };
  }

  const handleUpdate: (payload: SocketEventMap['workflow:progress']) => void = (data) => {
    if (data.workflowRunId === workflowRunId) {
      onUpdate(data as AIWorkflowUpdateData);
    }
  };

  return {
    subscribe: () => {
      eventClient.on<SocketEventMap['workflow:progress']>('workflow:progress', handleUpdate);
    },
    unsubscribe: () => {
      eventClient.off<SocketEventMap['workflow:progress']>('workflow:progress', handleUpdate);
    },
  };
}
