import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  expertiseApi,
  type ExpertiseLevel,
  type ExpertiseSignal,
} from '../api/expertise-api';

/**
 * 档位 hook（v2 纪要 §2.1 专长度向量）：读当前用户各领域解释密度，
 * level() 供决策卡知识夹层渲染（suppressed 隐藏 / terse 索引 / detailed 完整），
 * feedback() 上报学习信号（ignored 折叠忽略 / asked 主动追问 / suppress 别再解释 / reset）。
 */
export function useExpertise() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['memory', 'expertise'] as const,
    queryFn: () => expertiseApi.get(),
    staleTime: 60_000,
  });

  const level = useCallback(
    (domain: string | undefined): ExpertiseLevel => {
      if (!domain) return 'detailed';
      return (
        query.data?.domains.find((d) => d.domain === domain)?.level ?? 'detailed'
      );
    },
    [query.data],
  );

  const feedback = useCallback(
    async (domain: string, signal: ExpertiseSignal, context?: string) => {
      await expertiseApi.feedback(domain, signal, context);
      await queryClient.invalidateQueries({ queryKey: ['memory', 'expertise'] });
    },
    [queryClient],
  );

  return useMemo(
    () => ({ domains: query.data?.domains ?? [], level, feedback, isLoading: query.isLoading }),
    [query.data, query.isLoading, level, feedback],
  );
}
