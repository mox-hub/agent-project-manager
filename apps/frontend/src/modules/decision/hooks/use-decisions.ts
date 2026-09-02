/**
 * Decision Hooks —— 待决聚合查询 + 决议闭环 mutation
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptanceApi } from '@/modules/acceptance/api/acceptance-api';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { api } from '@/infrastructure/api-client';
import { decisionApi, type DecisionListParams } from '@/modules/decision/api/decision-api';
import type { Decision } from '@/shared/decision-card/types';

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

export type DecisionResolutionAction = 'accept' | 'reject' | 'waive';

/**
 * 决议闭环：卡片动作 → 各来源既有端点（不新增第二写路径）。
 * - approval  → POST /execution/approvals/:id/resolve（approved / rejected，reason 入 resolutionNote）
 * - acceptance → accept-completion / reject-completion / waive（reason 必填）
 * 成功后失效 decisions 与 acceptance 两组缓存，卡片自动移出待决列表。
 */
export function useResolveDecision() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      decision,
      action,
      reason,
    }: {
      decision: Decision;
      action: DecisionResolutionAction;
      reason?: string;
    }) => {
      if (decision.kind === 'approval') {
        if (action === 'waive') {
          throw new Error('waive is not applicable to approval decisions');
        }
        const resolution = action === 'accept' ? 'approved' : 'rejected';
        return api.post(`/execution/approvals/${decision.sourceId}/resolve`, {
          resolution,
          resolutionNote: reason,
        });
      }
      const userId = currentUser?.id;
      if (action === 'accept') {
        return acceptanceApi.acceptCompletion(decision.sourceId, undefined, userId);
      }
      if (action === 'waive') {
        if (!reason?.trim()) throw new Error('waive reason is required');
        return acceptanceApi.waiveCompletion(decision.sourceId, reason.trim(), userId);
      }
      if (!reason?.trim()) throw new Error('reject reason is required');
      return acceptanceApi.rejectCompletion(decision.sourceId, reason.trim(), userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: decisionKeys.all });
      qc.invalidateQueries({ queryKey: ['acceptance'] });
    },
  });
}
