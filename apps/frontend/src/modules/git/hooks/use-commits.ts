import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';

export function useCommits(
  repoId: string,
  params?: {
    from?: string;
    to?: string;
    author?: string;
    path?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  return useQuery({
    queryKey: ['commits', repoId, params],
    queryFn: () => gitApi.getCommits(repoId, params).then((res) => res.data),
    enabled: !!repoId,
  });
}

export function useCommit(commitId: string) {
  return useQuery({
    queryKey: ['commit', commitId],
    queryFn: () => gitApi.getCommitById(commitId).then((res) => res.data),
    enabled: !!commitId,
  });
}
