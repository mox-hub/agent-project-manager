/**
 * 执行桥 hooks —— 「转执行」mutation + 本会话执行行条目（应用会话内缓存，
 * 关闭面板不丢；终态执行行由 assistant-run-line 轮询呈现并回流建议卡）。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';
import { assistantApi } from '../api/assistant-api';

export interface AssistantRunEntry {
  runId: string;
  content: string;
  createdAt: string;
}

export const assistantRunKeys = {
  all: ['assistant', 'runs'] as const,
  runs: (projectId?: string) => [...assistantRunKeys.all, projectId ?? null] as const,
};

export function useAssistantRuns(projectId?: string) {
  return useQuery({
    queryKey: assistantRunKeys.runs(projectId),
    queryFn: () => [] as AssistantRunEntry[],
    staleTime: Infinity,
  });
}

export function useDispatchAssistantMessage(projectId: string | undefined) {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (content: string) => {
      if (!projectId) {
        return Promise.reject(new Error('execution requires a project scope'));
      }
      return assistantApi.dispatch(content, projectId);
    },
    onSuccess: (data, content) => {
      qc.setQueryData<AssistantRunEntry[]>(
        assistantRunKeys.runs(projectId),
        (old) => [
          ...(old ?? []),
          {
            runId: data.executionRunId,
            content,
            createdAt: new Date().toISOString(),
          },
        ],
      );
      toast.success(t('assistant.run.dispatched'));
    },
    onError: (error) => {
      toast.error(
        t('assistant.run.dispatchFailed', {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    },
  });
}
