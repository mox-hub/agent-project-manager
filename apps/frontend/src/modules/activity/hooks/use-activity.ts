/**
 * 动态追踪 hooks：实体操作记录 / 评论 / 表情回应。
 * query key 统一为 ['activities', entityId]（entityType 仅作查询参数，
 * 实体改类型后按 entityId 仍能取全量历史）。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import {
  activityApi,
  type ActivityEntityType,
  type ActivityItem,
} from '../api/activity-api';

export function useActivities(
  entityType: ActivityEntityType,
  entityId: string | undefined,
  options?: Omit<
    UseQueryOptions<ActivityItem[]>,
    'queryKey' | 'queryFn' | 'enabled'
  >,
) {
  return useQuery({
    queryKey: ['activities', entityId],
    enabled: !!entityId,
    queryFn: () => activityApi.list(entityType, entityId!),
    ...options,
  });
}

export function useAddComment(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activityApi.addComment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['activities', variables.entityId],
      });
      options?.onSuccess?.();
    },
  });
}

export function useUpdateComment(entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      activityApi.updateComment(id, content),
    onSuccess: () => {
      if (entityId) {
        queryClient.invalidateQueries({ queryKey: ['activities', entityId] });
      }
    },
  });
}

export function useDeleteComment(entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activityApi.deleteComment(id),
    onSuccess: () => {
      if (entityId) {
        queryClient.invalidateQueries({ queryKey: ['activities', entityId] });
      }
    },
  });
}

export function useToggleReaction(entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, emoji }: { activityId: string; emoji: string }) =>
      activityApi.toggleReaction(activityId, emoji),
    onSuccess: () => {
      if (entityId) {
        queryClient.invalidateQueries({ queryKey: ['activities', entityId] });
      }
    },
  });
}
