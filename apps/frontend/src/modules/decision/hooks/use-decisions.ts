/**
 * Decision Hooks —— 待决聚合查询（收件箱徽标与页面共用）
 */
import { useQuery } from '@tanstack/react-query';
import { decisionApi, type DecisionListParams } from '@/modules/decision/api/decision-api';

export const decisionKeys = {
  all: ['decisions'] as const,
  pending: (params: DecisionListParams) =>
    [...decisionKeys.all, 'pending', params] as const,
  summary: (projectId?: string) =>
    [...decisionKeys.all, 'summary', projectId ?? null] as const,
};

export function usePendingDecisions(params: DecisionListParams = {}) {
  return useQuery({
    queryKey: decisionKeys.pending(params),
    queryFn: () => decisionApi.listPending(params),
    placeholderData: (prev) => prev,
  });
}

export function useDecisionSummary(projectId?: string) {
  return useQuery({
    queryKey: decisionKeys.summary(projectId),
    queryFn: () => decisionApi.summary(projectId),
  });
}
