import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  integrationApi,
  type IntegrationListParams,
  type CreateIntegrationConfigRequest,
  type UpdateIntegrationConfigRequest,
} from '../api/integration-api';

export function useIntegrations(params?: IntegrationListParams) {
  return useQuery({
    queryKey: ['integrations', params],
    queryFn: () => integrationApi.getConfigs(params),
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
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationApi.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}
