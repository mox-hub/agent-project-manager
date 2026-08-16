import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/project-api';

export function useProjectHealthSnapshots(projectId: string, days: number = 30) {
  return useQuery({
    queryKey: ['projects', projectId, 'health-snapshots', days],
    queryFn: () => projectApi.getHealthSnapshots(projectId, days),
    enabled: !!projectId,
  });
}

export function useProjectAIContext(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'ai-context'],
    queryFn: () => projectApi.getAIContext(projectId),
    enabled: !!projectId,
  });
}

export function useRefreshAIContext(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectApi.refreshAIContext(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'ai-context'] });
    },
  });
}
