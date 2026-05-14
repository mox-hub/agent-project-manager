import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';
import type { Workspace, WorkspaceValidationResult } from '../api/git-api';

function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

export function useWorkspace(projectId: string) {
  return useQuery({
    queryKey: ['workspace', projectId],
    queryFn: async () => {
      const res = await gitApi.getWorkspace(projectId);
      return normalize<Workspace>(res.data);
    },
    enabled: !!projectId,
  });
}

export function useSetWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      dto,
    }: {
      projectId: string;
      dto: { localPath?: string; remoteUrl?: string; autoClone?: boolean };
    }) => gitApi.setWorkspace(projectId, dto).then((res) => res.data),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
    },
  });
}

export function useValidateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await gitApi.validateWorkspace(projectId);
      return normalize<WorkspaceValidationResult>(res.data);
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
    },
  });
}

export function useCloneRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      dto,
    }: {
      projectId: string;
      dto: { remoteUrl: string; localPath: string };
    }) => gitApi.cloneRepository(projectId, dto).then((res) => res.data),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
    },
  });
}
