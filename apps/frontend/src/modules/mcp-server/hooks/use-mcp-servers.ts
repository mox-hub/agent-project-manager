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
  type SaveMcpServerRequest,
} from '../api/mcp-servers-api';

export const cliProviderKeys = {
  all: ['cli-providers'] as const,
  detail: (id: CliProviderId) => ['cli-providers', id] as const,
  mcpStatus: ['mcp', 'status'] as const,
  mcpServers: ['mcp-servers'] as const,
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

// ── 外部 MCP Server 管理 hooks ─────────────────────────────────────────────

export function useMcpServers() {
  return useQuery({
    queryKey: cliProviderKeys.mcpServers,
    queryFn: () => mcpServersApi.listMcpServers(),
    staleTime: 15 * 1000,
  });
}

export function useCreateMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveMcpServerRequest) => mcpServersApi.createMcpServer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.mcpServers });
    },
  });
}

export function useUpdateMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveMcpServerRequest }) =>
      mcpServersApi.updateMcpServer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.mcpServers });
    },
  });
}

export function useDeleteMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mcpServersApi.deleteMcpServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.mcpServers });
    },
  });
}

export function useRefreshMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mcpServersApi.refreshMcpServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.mcpServers });
    },
  });
}

export function useRefreshAllMcpServers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mcpServersApi.refreshAllMcpServers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cliProviderKeys.mcpServers });
    },
  });
}
