import { api } from '@/infrastructure/api-client';
import type { ApiResponse } from '@/shared/types/api';

export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  channels: string[];
  status: NotificationStatus;
  readAt?: string | null;
  payloadJson?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationListParams {
  status?: NotificationStatus;
  type?: string;
  projectId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationPreferencesResponse {
  data: NotificationPreference[];
}

export interface NotificationListResponse {
  data: Notification[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface NotificationPreference {
  id: string;
  userId: string;
  projectId?: string | null;
  eventType: string;
  channels: string[];
  digestFrequency?: string | null;
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  } | null;
  enabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceItem {
  projectId?: string;
  eventType: string;
  channels: string[];
  digestFrequency?: string;
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  enabled?: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  preferences: NotificationPreferenceItem[];
}

export interface MarkAsReadRequest {
  id: string;
}

export interface MarkNotificationsReadRequest {
  ids: string[];
}

export const notificationApi = {
  getList: (params?: NotificationListParams) =>
    api.get<{ data: Notification[]; meta?: { page?: number; pageSize?: number; total?: number; } }>('/notifications', params) as unknown as Promise<NotificationListResponse>,

  markRead: (data: MarkNotificationsReadRequest) =>
    api.post<ApiResponse<void>>('/notifications/read', data),

  markAsRead: (data: MarkAsReadRequest) =>
    api.put<ApiResponse<void>>(`/notifications/${data.id}/read`),

  markAllAsRead: () =>
    api.put<ApiResponse<void>>('/notifications/read-all'),

  getPreferences: () =>
    api.get<NotificationPreferencesResponse>('/notifications/preferences'),

  updatePreferences: (data: UpdateNotificationPreferencesRequest) =>
    api.put<NotificationPreferencesResponse>('/notifications/preferences', data),
};
