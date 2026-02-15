import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, type ConfigScope } from '../api/config-api';

/**
 * Hook to get global configuration
 */
export function useGlobalConfig(keys?: string[]) {
  return useQuery({
    queryKey: ['config', 'global', keys],
    queryFn: () => configApi.getConfig({ scope: 'global', keys }),
    select: (response) => response.data,
  });
}

/**
 * Hook to update global configuration
 */
export function useUpdateGlobalConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Record<string, any>) =>
      configApi.setConfig({ scope: 'global', config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'global'] });
    },
  });
}

/**
 * Hook to delete global configuration keys
 */
export function useDeleteGlobalConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keys: string[]) =>
      configApi.deleteConfig({ scope: 'global', keys }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'global'] });
    },
  });
}
