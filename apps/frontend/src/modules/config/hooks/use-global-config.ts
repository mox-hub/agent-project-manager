import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, type ConfigScope } from '../api/config-api';

const SHORT_ID_PREFIX_KEY = 'task.shortIdPrefix';
const DEFAULT_SHORT_ID_PREFIX = 'APM';

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
 * Hook to get shortIdPrefix configuration
 */
export function useShortIdPrefix() {
  return useQuery({
    queryKey: ['config', 'shortIdPrefix'],
    queryFn: async () => {
      const response = await configApi.getConfig({ 
        scope: 'global', 
        keys: [SHORT_ID_PREFIX_KEY] 
      });
      return (response.data[SHORT_ID_PREFIX_KEY] as string) || DEFAULT_SHORT_ID_PREFIX;
    },
  });
}

/**
 * Hook to update shortIdPrefix configuration
 */
export function useUpdateShortIdPrefix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prefix: string) =>
      configApi.setConfig({ 
        scope: 'global', 
        config: { [SHORT_ID_PREFIX_KEY]: prefix } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'shortIdPrefix'] });
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
