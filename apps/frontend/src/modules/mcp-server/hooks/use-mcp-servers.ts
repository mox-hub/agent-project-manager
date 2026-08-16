/**
 * MCP Server / CLI Provider Hooks
 *
 * TanStack Query hooks 封装
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  mcpServersApi,
  type CliProviderId,
  type CliProviderStatus,
  type CliProvidersResponse,
  type ConfigureCliProviderRequest,
} from '../api/mcp-servers-api';

export const cliProviderKeys = {
  all: ['cli-providers'] as const,
  detail: (id: CliProviderId) => ['cli-providers', id] as const,
  mcpStatus: ['mcp', 'status'] as const,
};

export function useCliProviders(
  options?: Partial<UseQueryOptions<CliProvidersResponse>> & {
    enabled?: boolean;
  },
) {
  const { enabled, ...rest } = options ?? {};
  return useQuery({
    queryKey: cliProviderKeys.all,
    queryFn: () => mcpServersApi.listCliProviders(),
    enabled: enabled ?? true,
    staleTime: 30 * 1000,
    ...rest,
  });
}

export function useDetectCliProviders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mcpServersApi.detectCliProviders(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.all });
    },
  });
}

export function useHealthCheckCliProvider() {
  return useMutation({
    mutationFn: (providerId: CliProviderId) =>
      mcpServersApi.healthCheckCliProvider(providerId),
  });
}

export function useConfigureCliProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      providerId,
      data,
    }: {
      providerId: CliProviderId;
      data: ConfigureCliProviderRequest;
    }) => mcpServersApi.configureCliProvider(providerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.all });
      queryClient.invalidateQueries({
        queryKey: cliProviderKeys.detail(variables.providerId),
      });
    },
  });
}

export function useDeleteCliProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: CliProviderId) =>
      mcpServersApi.deleteCliProvider(providerId),
    onSuccess: (_, providerId) => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.all });
      queryClient.invalidateQueries({
        queryKey: cliProviderKeys.detail(providerId),
      });
    },
  });
}

export function useMcpServerStatus() {
  return useQuery({
    queryKey: cliProviderKeys.mcpStatus,
    queryFn: () => mcpServersApi.getMcpStatus(),
    staleTime: 60 * 1000,
  });
}

/**
 * 获取当前实际可用的 provider 列表（available && enabled）
 */
export function useAvailableCliProviders(options?: { enabled?: boolean }) {
  const query = useCliProviders(options);
  return {
    ...query,
    data: (query.data?.providers ?? []).filter(
      (p: CliProviderStatus) => p.available && p.enabled,
    ),
  };
}
