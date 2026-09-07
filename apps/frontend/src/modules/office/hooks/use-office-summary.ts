import { useQuery } from '@tanstack/react-query';
import { officeApi } from '../api/office-api';

export const officeKeys = {
  all: ['office'] as const,
  summary: (projectId?: string) => ['office', 'summary', projectId ?? 'workspace'] as const,
};

export function useOfficeSummary(projectId?: string) {
  return useQuery({
    queryKey: officeKeys.summary(projectId),
    queryFn: () => officeApi.getSummary(projectId),
  });
}
