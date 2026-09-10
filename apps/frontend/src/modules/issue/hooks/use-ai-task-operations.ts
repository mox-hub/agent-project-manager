import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';

export function useAssignTaskToAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: aiHubApi.assignTaskToAI,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.issueId] });
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId],
      });
      // AI 指派会同步主负责人（TaskAssignee），负责人面板一并刷新
      queryClient.invalidateQueries({
        queryKey: ['issue-assignees', variables.issueId],
      });
    },
    onError: (err) => {
      toast.error('分配任务给AI失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}
