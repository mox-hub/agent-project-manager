import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gitApi, type CreateRepositoryDto, type UpdateRepositoryDto } from '../api/git-api';
import type { Repository, RepositoryStatus } from '../api/git-api';

export function useRepositories(params?: {
  projectId?: string;
  provider?: string;
}) {
  return useQuery({
    queryKey: ['repositories', params],
    queryFn: () => gitApi.getRepositories(params),
  });
}

export function useRepository(repoId: string) {
  return useQuery({
    queryKey: ['repository', repoId],
    queryFn: () => gitApi.getRepositoryById(repoId),
    enabled: !!repoId,
  });
}

export function useRepositoryStatus(repoId: string) {
  return useQuery({
    queryKey: ['repository-status', repoId],
    queryFn: () => gitApi.getRepositoryStatus(repoId),
    enabled: !!repoId,
    refetchInterval: 30000,
  });
}

export function useCreateRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRepositoryDto) => gitApi.createRepository(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
    onError: (err) => {
      toast.error('创建仓库失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useUpdateRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoId, dto }: { repoId: string; dto: UpdateRepositoryDto }) =>
      gitApi.updateRepository(repoId, dto),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['repository', repoId] });
    },
    onError: (err) => {
      toast.error('更新仓库失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useDeleteRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => gitApi.deleteRepository(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
    onError: (err) => {
      toast.error('删除仓库失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}
