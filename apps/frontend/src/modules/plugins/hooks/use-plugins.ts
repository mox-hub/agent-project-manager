import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pluginApi } from '../api/plugin-api';
import type { PluginListParams } from '../api/plugin-api';

export function usePlugins(params?: PluginListParams) {
  return useQuery({
    queryKey: ['plugins', params],
    queryFn: async () => {
      const response = await pluginApi.getPlugins(params);
      return response.data;
    },
  });
}

export function usePlugin(id: string | undefined) {
  return useQuery({
    queryKey: ['plugin', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error('Plugin ID is required');
      const response = await pluginApi.getPlugin(id);
      return response.data;
    },
  });
}

export function useInstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pluginApi.installPlugin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });
}

export function useEnablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pluginApi.enablePlugin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });
}

export function useDisablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pluginApi.disablePlugin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });
}

export function useUninstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pluginApi.uninstallPlugin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });
}
