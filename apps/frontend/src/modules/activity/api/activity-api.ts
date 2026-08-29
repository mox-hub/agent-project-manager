import { api } from '@/infrastructure/api-client';

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

  addComment: (data: {
    entityType: ActivityEntityType;
    entityId: string;
    content: string;
  }) => api.post<ActivityItem>('/activities/comments', data),

  updateComment: (id: string, content: string) =>
    api.patch<ActivityItem>(`/activities/comments/${id}`, { content }),

  deleteComment: (id: string) => api.delete<void>(`/activities/comments/${id}`),

  toggleReaction: (activityId: string, emoji: string) =>
    api.post<ActivityReactionGroup[]>(`/activities/${activityId}/reactions`, {
      emoji,
    }),
};
