import { useQuery, useMutation } from '@tanstack/react-query';
import { gitApi } from '../api/git-api';
import type { PullRequest } from '../api/git-api';

function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

export function usePullRequests(
  repoId: string,
  params?: { status?: string; author?: string },
) {
  return useQuery({
    queryKey: ['pull-requests', repoId, params],
    queryFn: async () => {
      const res = await gitApi.getPullRequests(repoId, params);
      return normalize<PullRequest[]>(res.data) ?? [];
    },
    enabled: !!repoId,
  });
}

export function usePullRequest(prId: string) {
  return useQuery({
    queryKey: ['pull-request', prId],
    queryFn: async () => {
      const res = await gitApi.getPullRequestById(prId);
      return normalize<PullRequest>(res.data);
    },
    enabled: !!prId,
  });
}

export function useCreatePullRequestReview() {
  return useMutation({
    mutationFn: ({
      prId,
      dto,
    }: {
      prId: string;
      dto: {
        type: string;
        state: string;
        summary?: string;
        comments?: unknown[];
      };
    }) => gitApi.createPullRequestReview(prId, dto).then((res) => res.data),
  });
}
