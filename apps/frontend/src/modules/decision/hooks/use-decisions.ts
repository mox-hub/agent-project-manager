/**
 * Decision Hooks —— 待决聚合查询 + 决议闭环 mutation
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptanceApi } from '@/modules/acceptance/api/acceptance-api';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { api } from '@/infrastructure/api-client';
import { decisionApi, type DecisionListParams } from '@/modules/decision/api/decision-api';
import { isProposalKind, type Decision } from '@/shared/decision-card/types';

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

export type DecisionResolutionAction =
  | 'accept'
  | 'reject'
  | 'waive'
  | 'cancel'
  // contract_conflict 的三个裁决动作：卡键即裁决方向，resolve 时经
  // conflictAction 字段上送（payload 在提案升级时已固化，装不下此刻的选择）
  | 'accept_file'
  | 'accept_db'
  | 'detach';

const CONFLICT_ACTIONS = ['accept_file', 'accept_db', 'detach'] as const;

/**
 * 决议闭环：卡片动作 → 各来源既有端点（不新增第二写路径）。
 * - approval   → POST /execution/approvals/:id/resolve（approved / rejected，reason 入 resolutionNote）
 * - acceptance → accept-completion / reject-completion / waive（reason 必填）
 * - 建议类提案 → POST /decisions/proposals/:id/resolve（accept 执行 applier；clarify 携带 answer；
 *   contract_conflict 携带 conflictAction=accept_file|accept_db|detach，reject 仅留痕不裁决）
 * 成功后失效 decisions 与 acceptance 两组缓存，卡片自动移出待决列表。
 *
 * 历史缺陷：kind 不在 PROPOSAL_KINDS 词表内时会落到最下方的 acceptance 兜底分支，
 * 把提案 id 调成 acceptCompletion（验收通过）——release / contract_conflict 都栽过。
 */
export function useResolveDecision() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      decision,
      action,
      reason,
      answer,
    }: {
      decision: Decision;
      action: DecisionResolutionAction;
      reason?: string;
      answer?: string;
    }) => {
      if (decision.kind === 'contract_conflict') {
        if (action === 'waive' || action === 'cancel') {
          throw new Error('waive/cancel is not applicable to contract conflicts');
        }
        if (action === 'reject' && !reason?.trim()) {
          throw new Error('reject reason is required');
        }
        const isConflictAction = (CONFLICT_ACTIONS as readonly string[]).includes(action);
        return api.post(
          `/decisions/proposals/${decision.sourceId}/resolve`,
          {
            // 三个裁决键都走 accept（服务端执行 resolveConflict applier），
            // 具体方向由 conflictAction 承载；reject 仅留痕不裁决
            action: isConflictAction ? 'accept' : action,
            ...(isConflictAction ? { conflictAction: action } : {}),
            reason: reason?.trim() || undefined,
            // CAP-C-04：回传决议者所见内容的指纹，服务端校验「所见即所批」——
            // 决议期间内容被实质变更时服务端 409，禁止沿用旧印象的决议。
            expectedFingerprint: decision.contentFingerprint,
          },
        );
      }
      if (isProposalKind(decision.kind)) {
        return api.post(`/decisions/proposals/${decision.sourceId}/resolve`, {
          action: action === 'waive' ? 'reject' : action,
          reason,
          answer,
          // CAP-C-04：回传决议者所见内容的指纹，服务端校验「所见即所批」——
          // 决议期间内容被实质变更时服务端 409，禁止沿用旧印象的决议。
          expectedFingerprint: decision.contentFingerprint,
        });
      }
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: decisionKeys.all });
      if (vars.decision.kind === 'acceptance') {
        qc.invalidateQueries({ queryKey: ['acceptance'] });
      }
    },
  });
}
