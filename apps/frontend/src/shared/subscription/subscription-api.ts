/**
 * 订阅 API —— 页面/实体订阅者集合（订阅按钮，收藏旁）。
 * 后端 modules/subscription：GET 列表 / GET my / PUT 全量替换订阅者。
 */
import { api } from '@/infrastructure/api-client';

export interface SubscriptionScope {
  entityType: string;
  entityId: string;
}

export interface SubscriberItem {
  memberId: string;
  displayName: string;
  avatarUrl: string | null;
  type: string; // human | ai_agent
  userId: string | null;
  status: string;
}

export interface MySubscriptions {
  memberId: string | null;
  items: Array<{ entityType: string; entityId: string }>;
}

export const subscriptionApi = {
  listSubscribers: (scope: SubscriptionScope) =>
    api.get<{ items: SubscriberItem[] }>('/subscriptions', scope),
  my: () => api.get<MySubscriptions>('/subscriptions/my'),
  set: (scope: SubscriptionScope, memberIds: string[]) =>
    api.put<{ items: SubscriberItem[] }>('/subscriptions', {
      ...scope,
      memberIds,
    }),
};
