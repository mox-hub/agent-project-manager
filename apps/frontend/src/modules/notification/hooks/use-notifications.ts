import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, type NotificationListParams } from '../api/notification-api';

export function useNotifications(params?: NotificationListParams) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.getList(params),
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: async () => {
      const response = await notificationApi.getList({ status: 'unread', pageSize: 1 });
      return response.meta?.total || 0;
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
