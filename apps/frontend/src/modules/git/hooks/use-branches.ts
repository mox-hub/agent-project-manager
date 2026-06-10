import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gitApi } from '../api/git-api';
import type { BranchListResult } from '../api/git-api';

function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

export function useBranches(repoId: string, includeRemote = false) {
  return useQuery({
    queryKey: ['branches', repoId, { includeRemote }],
    queryFn: async () => {
      const res = await gitApi.getBranches(repoId, includeRemote);
      return normalize<BranchListResult>(res.data);
    },
    enabled: !!repoId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      repoId,
      dto,
    }: {
      repoId: string;
      dto: { name: string; from?: string; checkout?: boolean };
    }) => gitApi.createBranch(repoId, dto).then((res) => res.data),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] });
    },
    onError: (err) => {
      toast.error('创建分支失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      repoId,
      branchName,
      force,
    }: {
      repoId: string;
      branchName: string;
      force?: boolean;
    }) => gitApi.deleteBranch(repoId, branchName, force).then((res) => res.data),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] });
    },
    onError: (err) => {
      toast.error('删除分支失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useCheckoutBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      repoId,
      branchName,
      dto,
    }: {
      repoId: string;
      branchName: string;
      dto?: { create?: boolean; from?: string };
    }) => gitApi.checkoutBranch(repoId, branchName, dto).then((res) => res.data),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] });
      queryClient.invalidateQueries({ queryKey: ['repository-status', repoId] });
    },
    onError: (err) => {
      toast.error('切换分支失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}
