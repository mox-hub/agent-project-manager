import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics-api';

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview(),
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
