import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  notificationApi,
  type Notification,
  type NotificationListParams,
} from '../api/notification-api';

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
      const data = await notificationApi.getUnreadCount();
      return data?.count ?? 0;
    },
    // 60s 轮询兜底：主通道是 socket notification.created 失效，
    // 断线期间徽标不至于永远冻结
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => notificationApi.markRead({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      toast.error('标记已读失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export type { Notification };
