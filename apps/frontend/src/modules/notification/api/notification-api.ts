import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';
import type { PaginatedData } from '@/shared/types/api';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO）；quietHours
 * 现为具名 QuietHoursDto（start/end/timezone）。响应侧仍维持手写 interface。
 */

export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  projectId?: string | null;
  issueId?: string | null;
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

export type NotificationListResponse = PaginatedData<Notification>;

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

export type UpdateNotificationPreferencesRequest =
  RequestBodyOf<'NotificationController_updateNotificationPreferences'>;

export type NotificationPreferenceItem =
  UpdateNotificationPreferencesRequest['preferences'][number];

export interface MarkAsReadRequest {
  id: string;
}

export type MarkNotificationsReadRequest =
  RequestBodyOf<'NotificationController_markNotificationsRead'>;

export const notificationApi = {
  getList: (params?: NotificationListParams) =>
    api.getPaginated<Notification>('/notifications', params),

  markRead: (data: MarkNotificationsReadRequest) =>
    api.post<void>('/notifications/read', data),

  markAsRead: (data: MarkAsReadRequest) =>
    api.put<void>(`/notifications/${data.id}/read`),

  markAllAsRead: () =>
    api.put<void>('/notifications/read-all'),

  getPreferences: () =>
    api.get<NotificationPreference[]>('/notifications/preferences'),

  updatePreferences: (data: UpdateNotificationPreferencesRequest) =>
    api.put<NotificationPreference[]>('/notifications/preferences', data),
};
