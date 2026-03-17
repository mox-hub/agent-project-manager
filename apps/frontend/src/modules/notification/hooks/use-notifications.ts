import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationApi,
  type Notification,
  type NotificationListParams,
  type NotificationListResponse,
} from '../api/notification-api';

function normalizeNotificationListResponse(payload: unknown): NotificationListResponse {
  if (!payload || typeof payload !== 'object') {
    return { data: [] };
  }

  const topLevel = payload as {
    data?: unknown;
    meta?: NotificationListResponse['meta'];
  };

  if (Array.isArray(topLevel.data)) {
    return {
      data: topLevel.data as Notification[],
      meta: topLevel.meta,
    };
  }

  if (topLevel.data && typeof topLevel.data === 'object') {
    const nested = topLevel.data as {
      data?: unknown;
      meta?: NotificationListResponse['meta'];
    };

    if (Array.isArray(nested.data)) {
      return {
        data: nested.data as Notification[],
        meta: nested.meta ?? topLevel.meta,
      };
    }
  }

  return { data: [] };
}

export function useNotifications(params?: NotificationListParams) {
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const response = await notificationApi.getList(params);
      return normalizeNotificationListResponse(response);
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: async () => {
      const response = await notificationApi.getList({ status: 'unread', pageSize: 1 });
      return normalizeNotificationListResponse(response).meta?.total || 0;
    },
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => notificationApi.markRead({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
