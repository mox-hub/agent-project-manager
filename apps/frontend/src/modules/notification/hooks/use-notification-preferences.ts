import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationApi,
  type UpdateNotificationPreferencesRequest,
} from '../api/notification-api';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationApi.getPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNotificationPreferencesRequest) =>
      notificationApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
