import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gitApi, type CreateRepositoryDto, type UpdateRepositoryDto } from '../api/git-api';
import type { Repository, RepositoryStatus } from '../api/git-api';

// 兼容 MSW handler 的 { data: T[] } 和后端直接返回的 T[]
function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'data' in data) {
    const nested = (data as { data: unknown }).data;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
}

// 兼容 MSW handler 的 { data: T } 和后端直接返回的 T
function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

export function useRepositories(params?: {
  projectId?: string;
  provider?: string;
}) {
  return useQuery({
    queryKey: ['repositories', params],
    queryFn: async () => {
      const res = await gitApi.getRepositories(params);
      return normalizeList<Repository>(res.data);
    },
  });
}

export function useRepository(repoId: string) {
  return useQuery({
    queryKey: ['repository', repoId],
    queryFn: async () => {
      const res = await gitApi.getRepositoryById(repoId);
      return normalize<Repository>(res.data);
    },
    enabled: !!repoId,
  });
}

export function useRepositoryStatus(repoId: string) {
  return useQuery({
    queryKey: ['repository-status', repoId],
    queryFn: async () => {
      const res = await gitApi.getRepositoryStatus(repoId);
      return normalize<RepositoryStatus>(res.data);
    },
    enabled: !!repoId,
    refetchInterval: 30000,
  });
}

export function useCreateRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRepositoryDto) =>
      gitApi.createRepository(dto).then((res) => normalize<Repository>(res.data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}

export function useUpdateRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoId, dto }: { repoId: string; dto: UpdateRepositoryDto }) =>
      gitApi.updateRepository(repoId, dto).then((res) => normalize<Repository>(res.data)),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['repository', repoId] });
    },
  });
}

export function useDeleteRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) =>
      gitApi.deleteRepository(repoId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}
