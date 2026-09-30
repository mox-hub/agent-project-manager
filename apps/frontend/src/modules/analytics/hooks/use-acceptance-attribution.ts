import { useQuery } from '@tanstack/react-query';
import {
  aiHubApi,
  type AcceptanceAttributionStats,
} from '@/modules/ai-hub/api/ai-hub-api';

/**
 * 验收归因成本数据源 = GET /ai/usage/acceptance-attribution（CAP-C-06，G8 缺口兑现）。
 * 归因看累计口径而非区间，不做时间范围过滤（与成本 Tab 的 range 选择器解耦）。
 */
export function useAcceptanceAttribution() {
  return useQuery({
    queryKey: ['ai-usage-acceptance-attribution'],
    queryFn: () => aiHubApi.getAcceptanceAttribution(),
    select: (data: AcceptanceAttributionStats) => data,
  });
}
