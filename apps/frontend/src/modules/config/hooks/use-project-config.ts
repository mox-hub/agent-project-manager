import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi } from '../api/config-api';

/**
 * Hook to get project configuration
 */
export function useProjectConfig(projectId: string, keys?: string[]) {
  return useQuery({
    queryKey: ['config', 'project', projectId, keys],
    queryFn: () => configApi.getConfig({ scope: 'project', projectId, keys }),
    select: (response) => response.data,
    enabled: !!projectId,
  });
}

/**
 * Hook to update project configuration
 */
export function useUpdateProjectConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Record<string, any>) =>
      configApi.setConfig({ scope: 'project', projectId, config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'project', projectId] });
    },
  });
}

/**
 * Hook to delete project configuration keys
 */
export function useDeleteProjectConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keys: string[]) =>
      configApi.deleteConfig({ scope: 'project', projectId, keys }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'project', projectId] });
    },
  });
}
