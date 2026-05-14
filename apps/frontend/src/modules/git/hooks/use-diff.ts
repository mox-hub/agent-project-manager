import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';
import type { DiffResult } from '../api/git-api';

function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

export function useWorkingDiff(repoId: string) {
  return useQuery({
    queryKey: ['working-diff', repoId],
    queryFn: async () => {
      const res = await gitApi.getWorkingDiff(repoId);
      return normalize<DiffResult>(res.data);
    },
    enabled: !!repoId,
    refetchInterval: 10000,
  });
}

export function useStagedDiff(repoId: string) {
  return useQuery({
    queryKey: ['staged-diff', repoId],
    queryFn: async () => {
      const res = await gitApi.getStagedDiff(repoId);
      return normalize<DiffResult>(res.data);
    },
    enabled: !!repoId,
    refetchInterval: 10000,
  });
}

export function useDiff(dto: {
  repoId: string;
  baseRef: string;
  targetRef: string;
  pathFilter?: string[];
}) {
  return useQuery({
    queryKey: ['diff', dto.repoId, dto.baseRef, dto.targetRef, dto.pathFilter],
    queryFn: async () => {
      const res = await gitApi.generateDiff(dto);
      return normalize<DiffResult>(res.data);
    },
    enabled: !!dto.repoId && !!dto.baseRef && !!dto.targetRef,
  });
}
