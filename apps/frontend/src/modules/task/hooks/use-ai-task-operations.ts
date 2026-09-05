import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { aiHubApi, type AssignTaskToAIRequest } from '@/modules/ai-hub/api/ai-hub-api';

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
