import { api } from '@/infrastructure/api-client';

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

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface MarkNotificationsReadRequest {
  ids: string[];
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

export interface NotificationPreferencesResponse {
  data: NotificationPreference[];
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

export const notificationApi = {
  getList: (params?: NotificationListParams) =>
    api.get<NotificationListResponse>('/notifications', params),

  markRead: (data: MarkNotificationsReadRequest) =>
    api.post('/notifications/read', data),

  getPreferences: () =>
    api.get<NotificationPreferencesResponse>('/notifications/preferences'),

  updatePreferences: (data: UpdateNotificationPreferencesRequest) =>
    api.put<NotificationPreferencesResponse>('/notifications/preferences', data),
};
