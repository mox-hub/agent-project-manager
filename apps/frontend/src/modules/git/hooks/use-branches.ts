import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';
import type { BranchListResult } from '../api/git-api';

export function useBranches(repoId: string, includeRemote?: boolean) {
  return useQuery({
    queryKey: ['branches', repoId, includeRemote],
    queryFn: () => gitApi.getBranches(repoId, includeRemote),
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
    }) => gitApi.createBranch(repoId, dto),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] });
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
    }) => gitApi.deleteBranch(repoId, branchName, force),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] });
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
    }) => gitApi.checkoutBranch(repoId, branchName, dto),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] });
      queryClient.invalidateQueries({ queryKey: ['repository-status', repoId] });
    },
  });
}

export type { BranchListResult };
