import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';
import type { Commit, CommitFile } from '../api/git-api';

// 兼容 MSW 的 { data: T } 和后端直接返回的 T
function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

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
    queryFn: async () => {
      const res = await gitApi.getCommitById(commitId);
      return normalize<Commit>(res.data);
    },
    enabled: !!commitId,
  });
}

export function useCommitFiles(commitId: string) {
  return useQuery({
    queryKey: ['commit-files', commitId],
    queryFn: async () => {
      const res = await gitApi.getCommitById(commitId);
      const commit = normalize<Commit & { files?: CommitFile[] }>(res.data);
      return commit?.files ?? [];
    },
    enabled: !!commitId,
  });
}
