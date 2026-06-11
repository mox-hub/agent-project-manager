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

// 兼容 MSW 的 { data: { data: [], total } } 和后端的 { data: [], total }
function normalizeCommitsResponse(data: unknown): {
  data: Commit[];
  total: number;
  page: number;
  pageSize: number;
} {
  if (!data || typeof data !== 'object') {
    return { data: [], total: 0, page: 1, pageSize: 20 };
  }
  
  const obj = data as Record<string, unknown>;
  
  // 如果 data 是数组（直接返回的格式）
  if (Array.isArray(obj.data)) {
    return {
      data: obj.data as Commit[],
      total: typeof obj.total === 'number' ? obj.total : obj.data.length,
      page: typeof obj.page === 'number' ? obj.page : 1,
      pageSize: typeof obj.pageSize === 'number' ? obj.pageSize : 20,
    };
  }
  
  // 如果 data.data 是数组（MSW 格式）
  if (obj.data && typeof obj.data === 'object' && 'data' in (obj.data as object)) {
    const nested = (obj.data as { data: unknown; total?: number; page?: number; pageSize?: number });
    return {
      data: normalize<Commit[]>(nested) ?? [],
      total: nested.total ?? 0,
      page: nested.page ?? 1,
      pageSize: nested.pageSize ?? 20,
    };
  }
  
  return { data: [], total: 0, page: 1, pageSize: 20 };
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
    queryFn: () => gitApi.getCommits(repoId, params).then((res) => normalizeCommitsResponse(res.data)),
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
