import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';
import type { Commit, CommitFile } from '../api/git-api';

/**
 * 分页载荷归一化：标准契约是 {items,total,...}（PaginatedDataDto），
 * 但历史服务端把列表放在 data 字段，甚至可能返回裸数组。
 * 在 hook 边界统一成 {items,total}，UI 层不再接触原始形状（否则 data.items.length 直接崩）。
 */
function normalizePaged<T>(payload: unknown): { items: T[]; total: number } {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length };
  }
  const paged = (payload ?? {}) as { items?: T[]; data?: T[]; total?: number };
  const items = paged.items ?? paged.data ?? [];
  return { items, total: paged.total ?? items.length };
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
    queryFn: async () => normalizePaged<Commit>(await gitApi.getCommits(repoId, params)),
    enabled: !!repoId,
  });
}

export function useCommit(commitId: string) {
  return useQuery({
    queryKey: ['commit', commitId],
    queryFn: () => gitApi.getCommitById(commitId),
    enabled: !!commitId,
  });
}

export function useCommitFiles(commitId: string) {
  return useQuery({
    queryKey: ['commit-files', commitId],
    queryFn: async () => {
      const commit = await gitApi.getCommitById(commitId);
      return commit?.files ?? [];
    },
    enabled: !!commitId,
  });
}