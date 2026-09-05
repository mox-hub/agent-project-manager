/**
 * 订阅 hooks —— 路由 → 订阅作用域推导 + 订阅者查询/替换。
 * 作用域按路由自动推导（与详情页一一对应）；列表页无实体上下文返回 null（按钮隐藏）。
 */
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscriptionApi,
  type SubscriberItem,
  type SubscriptionScope,
} from './subscription-api';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  subscribers: (scope: SubscriptionScope) =>
    [...subscriptionKeys.all, 'subscribers', scope.entityType, scope.entityId] as const,
  my: () => [...subscriptionKeys.all, 'my'] as const,
};

/** 从路由推导订阅作用域；无法识别的页面返回 null */
export function deriveScopeFromPath(pathname: string): SubscriptionScope | null {
  const rules: Array<[RegExp, string]> = [
    [/^\/app\/projects\/(?!dashboard$)([^/]+)/, 'project'],
    [/^\/app\/tasks\/([^/]+)/, 'task'],
    [/^\/app\/bugs\/([^/]+)/, 'bug'],
    [/^\/app\/documents\/([^/]+)/, 'document'],
    [/^\/app\/acceptance\/([^/]+)/, 'acceptance'],
    [/^\/app\/repositories\/([^/]+)/, 'repository'],
    [/^\/app\/members\/([^/]+)/, 'member'],
    [/^\/app\/teams\/([^/]+)/, 'team'],
  ];
  for (const [re, entityType] of rules) {
    const m = pathname.match(re);
    if (m) return { entityType, entityId: m[1] };
  }
  return null;
}

export function useRouteSubscriptionScope(): SubscriptionScope | null {
  const location = useLocation();
  return useMemo(() => deriveScopeFromPath(location.pathname), [location.pathname]);
}

export function useSubscribers(scope: SubscriptionScope | null) {
  return useQuery({
    queryKey: subscriptionKeys.subscribers(scope ?? { entityType: '-', entityId: '-' }),
    queryFn: () => subscriptionApi.listSubscribers(scope!),
    enabled: !!scope,
    staleTime: 30 * 1000,
  });
}

export function useMySubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.my(),
    queryFn: () => subscriptionApi.my(),
    staleTime: 60 * 1000,
  });
}

export function useSetSubscribers(scope: SubscriptionScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: string[]) => subscriptionApi.set(scope, memberIds),
    onSuccess: (data) => {
      qc.setQueryData(subscriptionKeys.subscribers(scope), data);
      void qc.invalidateQueries({ queryKey: subscriptionKeys.my() });
    },
  });
}

export type { SubscriberItem, SubscriptionScope };
