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

export interface UpdateNotificationPreferencesRequest {
  preferences: NotificationPreference[];
}

// P0-TS-004: 添加notification-api.ts的put方法 - AI TODO.md

export interface MarkAsReadRequest {
  id: string;
}

// 标记通知为已读
async markAsRead(data: MarkAsReadRequest): Promise<ApiResponse<void>> {
  return api.put(`/notifications/${data.id}/read`);
}

// 标记所有通知为已读
async markAllAsRead(): Promise<ApiResponse<void>> {
  return api.put('/notifications/read-all');
}

// 更新用户通知偏好设置
async updatePreferences(data: UpdateNotificationPreferencesRequest): Promise<ApiResponse<NotificationPreference[]>> {
  return api.put('/notifications/preferences', data);
}

// 获取用户通知偏好
async getPreferences(): Promise<ApiResponse<NotificationPreference[]>> {
  return api.get('/notifications/preferences');
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
