import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics-api';

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview().then((res) => res.data),
  });
}

