import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';

/** CAP-A-27 quick-judge 通道设置（advisory 判断通道启停与指向） */
export interface QuickJudgeSettings {
  enabled: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

const QUERY_KEY = ['ai-hub', 'quick-judge-settings'] as const;

export function useQuickJudgeSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<QuickJudgeSettings>('/ai/quick-judge/settings'),
  });
}

export function useUpdateQuickJudgeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<QuickJudgeSettings, 'enabled' | 'provider' | 'model' | 'baseUrl'>>) =>
      api.put<QuickJudgeSettings>('/ai/quick-judge/settings', patch),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}
