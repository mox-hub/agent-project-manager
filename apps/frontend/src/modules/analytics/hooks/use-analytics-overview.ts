import { useQuery } from '@tanstack/react-query';
import { isMockModeEnabled } from '@/mocks';
import { analyticsApi } from '../api/analytics-api';

/**
 * /analytics/overview 是契约提案端点（api-contract-proposals.md §2），后端尚未实现——
 * 真实模式请求会 404。仅 mock 模式启用（msw handler 提供演示数据，供 Cost/Quality/Risk/Team
 * 四个形态 Tab 评审）；真实数据消费方请用 useDashboardOverview（GET /dashboard/overview）。
 */
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview(),
    enabled: isMockModeEnabled(),
  });
}

export function useProfileHealth() {
  return useQuery({
    queryKey: ['dashboard', 'profile-health'],
    queryFn: () => analyticsApi.getProfileHealth(),
  });
}

export function usePlaybookHealth() {
  return useQuery({
    queryKey: ['dashboard', 'playbook-health'],
    queryFn: () => analyticsApi.getPlaybookHealth(),
  });
}
