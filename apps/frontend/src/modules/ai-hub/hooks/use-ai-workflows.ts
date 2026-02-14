import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';
import type {
  AIWorkflow,
  RunWorkflowRequest,
  RunWorkflowResponse,
} from '../api/ai-hub-api';
import { eventClient } from '@/infrastructure/event-client';

export function useAIWorkflows() {
  return useQuery({
    queryKey: ['aiWorkflows'],
    queryFn: async () => {
      const response = await aiHubApi.getWorkflows();
      return response.data;
    },
  });
}

export function useAIWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ['aiWorkflow', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error('Workflow ID is required');
      }
      const response = await aiHubApi.getWorkflow(id);
      return response.data;
    },
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

export function useAIWorkflowUpdates(
  workflowRunId: string | undefined,
  onUpdate: (data: {
    workflowRunId: string;
    stepId?: string;
    status: string;
    output?: any;
    error?: any;
  }) => void,
) {
  if (!workflowRunId) {
    return { subscribe: () => {}, unsubscribe: () => {} };
  }

  const handleUpdate = (data: {
    workflowRunId: string;
    stepId?: string;
    status: string;
    output?: any;
    error?: any;
  }) => {
    if (data.workflowRunId === workflowRunId) {
      onUpdate(data);
    }
  };

  return {
    subscribe: () => {
      eventClient.on('ai.workflow.update', handleUpdate);
    },
    unsubscribe: () => {
      eventClient.off('ai.workflow.update', handleUpdate);
    },
  };
}
