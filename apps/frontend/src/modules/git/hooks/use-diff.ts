import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';
import type { DiffResult } from '../api/git-api';

export function useWorkingDiff(repoId: string) {
  return useQuery({
    queryKey: ['working-diff', repoId],
    queryFn: () => gitApi.getWorkingDiff(repoId),
    enabled: !!repoId,
    refetchInterval: 10000,
  });
}

export function useStagedDiff(repoId: string) {
  return useQuery({
    queryKey: ['staged-diff', repoId],
    queryFn: () => gitApi.getStagedDiff(repoId),
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
    queryFn: () => gitApi.generateDiff(dto),
    enabled: !!dto.repoId && !!dto.baseRef && !!dto.targetRef,
  });
}