import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { gitApi } from '../api/git-api';
import type { PullRequest } from '../api/git-api';

export function usePullRequests(
  repoId: string,
  params?: { status?: string; author?: string },
) {
  return useQuery({
    queryKey: ['pull-requests', repoId, params],
    queryFn: () => gitApi.getPullRequests(repoId, params),
    enabled: !!repoId,
  });
}

export function usePullRequest(prId: string) {
  return useQuery({
    queryKey: ['pull-request', prId],
    queryFn: () => gitApi.getPullRequestById(prId),
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
    }) => gitApi.createPullRequestReview(prId, dto),
    onError: (err) => {
      toast.error('创建PR评审失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}