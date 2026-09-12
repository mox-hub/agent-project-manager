/**
 * Release Hooks——发版列表/详情查询 + 状态机动作 mutation。
 * 发布执行为服务端长动作（tag/GitHub Release），页面轮询详情刷新执行日志。
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  releaseApi,
  type CreateReleaseRequest,
  type ReleaseStatus,
  type UpdateReleaseRequest,
} from '../api/release-api';

export const releaseKeys = {
  all: ['releases'] as const,
  list: (projectId?: string) => [...releaseKeys.all, 'list', projectId ?? ''] as const,
  detail: (id?: string) => [...releaseKeys.all, 'detail', id ?? ''] as const,
};

export function useReleases(projectId?: string) {
  return useQuery({
    queryKey: releaseKeys.list(projectId),
    enabled: !!projectId,
    queryFn: () => releaseApi.list(projectId!),
  });
}

export function useRelease(id?: string) {
  return useQuery({
    queryKey: releaseKeys.detail(id),
    enabled: !!id,
    queryFn: () => releaseApi.detail(id!),
    // 发布执行是异步长动作：publishing 期间 5s 轮询执行日志
    refetchInterval: (query) =>
      (query.state.data as { status?: ReleaseStatus } | undefined)?.status ===
      'publishing'
        ? 5000
        : false,
  });
}

function useInvalidateReleases() {
  const queryClient = useQueryClient();
  return (releaseId?: string) => {
    queryClient.invalidateQueries({ queryKey: releaseKeys.all });
    if (releaseId) {
      queryClient.invalidateQueries({ queryKey: releaseKeys.detail(releaseId) });
    }
  };
}

export function useCreateRelease() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: (data: CreateReleaseRequest) => releaseApi.create(data),
    onSuccess: (release) => invalidate(release.id),
  });
}

export function useUpdateRelease(releaseId: string) {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: (data: UpdateReleaseRequest) => releaseApi.update(releaseId, data),
    onSuccess: () => invalidate(releaseId),
  });
}

export function useGateRelease(releaseId: string) {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: () => releaseApi.gate(releaseId),
    onSuccess: () => invalidate(releaseId),
  });
}

export function useApprovalRequest(releaseId: string) {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: () => releaseApi.approvalRequest(releaseId),
    onSuccess: () => invalidate(releaseId),
  });
}

export function usePublishRelease(releaseId: string) {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: () => releaseApi.publish(releaseId),
    onSuccess: () => invalidate(releaseId),
  });
}

export function useRejectRelease(releaseId: string) {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: (reason?: string) => releaseApi.reject(releaseId, reason),
    onSuccess: () => invalidate(releaseId),
  });
}

export function useReopenRelease(releaseId: string) {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: () => releaseApi.reopen(releaseId),
    onSuccess: () => invalidate(releaseId),
  });
}

export function useRecommendVersion(projectId?: string, excludeReleaseId?: string) {
  return useMutation({
    mutationFn: () => {
      if (!projectId) {
        return Promise.reject(new Error('projectId required'));
      }
      return releaseApi.recommendVersion(projectId, excludeReleaseId);
    },
  });
}
