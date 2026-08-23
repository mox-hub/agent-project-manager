import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { taskApi, type Task } from '../api/task-api';
import { aiHubApi, type AIAgent } from '@/modules/ai-hub/api/ai-hub-api';

export function useClaimTaskForAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      aiAgentId,
      aiExecutionSpec,
    }: {
      taskId: string;
      aiAgentId: string;
      aiExecutionSpec?: unknown;
    }) =>
      taskApi.claimForAI(taskId, { aiAgentId, aiExecutionSpec }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (err) => {
      toast.error('认领任务失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useSubmitAISuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      aiSuggestion,
      aiExecutionSpec,
    }: {
      taskId: string;
      aiSuggestion: unknown;
      aiExecutionSpec?: unknown;
    }) =>
      taskApi.submitAISuggestion(taskId, { aiSuggestion, aiExecutionSpec }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (err) => {
      toast.error('提交AI建议失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useSubmitAIExecutionResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      aiExecutionResult,
      aiExecutionStatus,
      error,
    }: {
      taskId: string;
      aiExecutionResult: unknown;
      aiExecutionStatus: 'completed' | 'failed';
      error?: string;
    }) =>
      taskApi.submitAIExecutionResult(taskId, {
        aiExecutionResult,
        aiExecutionStatus,
        error,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (err) => {
      toast.error('提交AI执行结果失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useAIDiscoverableTasks(
  projectId: string | undefined,
  params?: { status?: string; priority?: string },
) {
  return useQuery({
    queryKey: ['ai-discoverable-tasks', projectId, params],
    queryFn: () =>
      taskApi.findAIDiscoverableTasks(projectId!, params),
    enabled: !!projectId,
  });
}

export function useAvailableAgents(projectId: string | undefined) {
  return useQuery({
    queryKey: ['ai-agents', projectId],
    queryFn: () =>
      aiHubApi.getAvailableAgents(projectId!),
    enabled: !!projectId,
  });
}

export function useAssignTaskToAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: aiHubApi.assignTaskToAI,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId],
      });
    },
    onError: (err) => {
      toast.error('分配任务给AI失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}
