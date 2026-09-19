import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiHubApi, type UsageStats } from '@/modules/ai-hub/api/ai-hub-api';

export type AiUsageRange = '7d' | '30d' | 'all';

export const AI_USAGE_RANGE_OPTIONS: Array<{ id: AiUsageRange; days?: number }> = [
  { id: '7d', days: 7 },
  { id: '30d', days: 30 },
  { id: 'all' },
];

/**
 * 成本 Tab 数据源 = GET /ai/usage（AIUsageLog 聚合：LLM 对话/静默/CLI 执行三路统一记账）。
 * CAP-C-06 迁移（2026-09-19）：原设置「AI 用量」页消费面迁入 analytics 成本 Tab，
 * queryKey 沿用旧页口径保证缓存共享。
 */
export function useAiUsage(range: AiUsageRange) {
  const from = useMemo(() => {
    const option = AI_USAGE_RANGE_OPTIONS.find((r) => r.id === range);
    if (!option?.days) return undefined;
    const date = new Date();
    date.setDate(date.getDate() - option.days);
    return date.toISOString();
  }, [range]);

  return useQuery({
    queryKey: ['ai-usage', range],
    queryFn: () => aiHubApi.getUsage(from ? { from } : undefined),
    select: (data: UsageStats) => data,
  });
}
