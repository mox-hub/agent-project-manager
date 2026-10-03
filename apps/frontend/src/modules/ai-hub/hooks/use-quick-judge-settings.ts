import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';

/** CAP-A-27 quick-judge 通道设置（advisory 判断通道启停与指向） */
export interface QuickJudgeSettings {
  enabled: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  /** 每场景介入开关：显式 false=用户禁用该介入点；未配置/true=跟随总开关 */
  scenarios: Record<string, boolean>;
}

/** 判定记录单条（AIUsageLog kind=judge 读侧投影） */
export interface QuickJudgeLogItem {
  id: string;
  scenario: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  questions: number;
  answers: Record<
    string,
    { value: number | string | null; confidence: number | null }
  >;
  createdAt: string;
}

export interface QuickJudgeLogsPage {
  items: QuickJudgeLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

const QUERY_KEY = ['ai-hub', 'quick-judge-settings'] as const;
const LOGS_KEY = ['ai-hub', 'quick-judge-logs'] as const;

export function useQuickJudgeSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<QuickJudgeSettings>('/ai/quick-judge/settings'),
  });
}

export function useUpdateQuickJudgeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      patch: Partial<
        Pick<QuickJudgeSettings, 'enabled' | 'provider' | 'model' | 'baseUrl' | 'scenarios'>
      >,
    ) => api.put<QuickJudgeSettings>('/ai/quick-judge/settings', patch),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}

export function useQuickJudgeLogs(params: {
  scenario?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [...LOGS_KEY, params.scenario ?? '', params.page ?? 1, params.pageSize ?? 20],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.scenario) qs.set('scenario', params.scenario);
      qs.set('page', String(params.page ?? 1));
      qs.set('pageSize', String(params.pageSize ?? 20));
      return api.get<QuickJudgeLogsPage>(`/ai/quick-judge/logs?${qs.toString()}`);
    },
  });
}
