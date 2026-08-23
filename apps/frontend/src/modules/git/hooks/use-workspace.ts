import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { gitApi } from '../api/git-api';
import type { Workspace, WorkspaceValidationResult } from '../api/git-api';

export function useWorkspace(projectId: string) {
  return useQuery({
    queryKey: ['workspace', projectId],
    queryFn: () => gitApi.getWorkspace(projectId),
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
    }) => gitApi.setWorkspace(projectId, dto),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
    },
    onError: (err) => {
      toast.error('设置工作空间失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useValidateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => gitApi.validateWorkspace(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
    },
    onError: (err) => {
      toast.error('验证工作空间失败: ' + (err instanceof Error ? err.message : '未知错误'));
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
    }) => gitApi.cloneRepository(projectId, dto),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
    },
    onError: (err) => {
      toast.error('克隆仓库失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}