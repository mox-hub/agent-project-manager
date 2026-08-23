import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  integrationApi,
  type IntegrationListParams,
  type IntegrationListResponse,
  type CreateIntegrationConfigRequest,
  type UpdateIntegrationConfigRequest,
  type IntegrationConfig,
} from '../api/integration-api';

function normalizeIntegrationListResponse(payload: unknown): IntegrationListResponse {
  if (!payload || typeof payload !== 'object') {
    return { data: [] };
  }

  const topLevel = payload as {
    data?: unknown;
    meta?: IntegrationListResponse['meta'];
  };

  if (Array.isArray(topLevel.data)) {
    return {
      data: topLevel.data as IntegrationConfig[],
      meta: topLevel.meta,
    };
  }

  if (topLevel.data && typeof topLevel.data === 'object') {
    const nested = topLevel.data as {
      data?: unknown;
      meta?: IntegrationListResponse['meta'];
    };
    if (Array.isArray(nested.data)) {
      return {
        data: nested.data as IntegrationConfig[],
        meta: nested.meta ?? topLevel.meta,
      };
    }
  }

  return { data: [] };
}

export function useIntegrations(params?: IntegrationListParams) {
  return useQuery<IntegrationListResponse>({
    queryKey: ['integrations', params],
    queryFn: async () => {
      const response = await integrationApi.getConfigs(params);
      return normalizeIntegrationListResponse(response);
    },
  });
}

export function useIntegration(id: string) {
  return useQuery({
    queryKey: ['integrations', id],
    queryFn: () => integrationApi.getConfig(id),
    enabled: !!id,
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIntegrationConfigRequest) =>
      integrationApi.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create integration');
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIntegrationConfigRequest }) =>
      integrationApi.updateConfig(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update integration');
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationApi.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete integration');
    },
  });
}
