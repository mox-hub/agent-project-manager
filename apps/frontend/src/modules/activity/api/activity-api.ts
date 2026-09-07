import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO），响应体
 * 在服务端补 @ApiOkResponse 之前仍维持手写 interface。
 */
export type ActivityEntityType = 'task' | 'bug' | 'project';

export interface ActivityActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ActivityChange {
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface ActivityReactionGroup {
  emoji: string;
  count: number;
  users: ActivityActor[];
  reactedByMe: boolean;
}

export interface ActivityItem {
  id: string;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  type: string;
  summary?: string | null;
  content?: string | null;
  changes?: ActivityChange[] | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor: ActivityActor | null;
  reactions: ActivityReactionGroup[];
}

export const activityApi = {
  list: (entityType: ActivityEntityType | undefined, entityId: string) =>
    api.get<ActivityItem[]>('/activities', { entityType, entityId }),

  addComment: (data: RequestBodyOf<'ActivityController_addComment'>) =>
    api.post<ActivityItem>('/activities/comments', data),

  updateComment: (id: string, content: string) =>
    api.patch<ActivityItem>(`/activities/comments/${id}`, { content }),

  deleteComment: (id: string) => api.delete<void>(`/activities/comments/${id}`),

  toggleReaction: (activityId: string, emoji: string) =>
    api.post<ActivityReactionGroup[]>(`/activities/${activityId}/reactions`, {
      emoji,
    }),
};
