import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';

export function useAssignTaskToAI() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      toast.error(
        t('task.aiAssign.failed', {
          message: err instanceof Error ? err.message : t('task.messages.unknownError'),
        }),
      );
    },
  });
}
