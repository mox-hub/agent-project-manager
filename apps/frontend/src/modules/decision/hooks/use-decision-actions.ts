/**
 * 决策卡动作接线 —— 收件箱与主 AI 助手面板共用的单一来源。
 * 动作 → useResolveDecision（按 kind 分发各来源既有闭环端点）+ 成功/失败 toast；
 * 微调/替代方案暂无重提案写路径，显式提示待接入。
 */
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import type { Decision } from '@/shared/decision-card/types';
import {
  useResolveDecision,
  type DecisionResolutionAction,
} from './use-decisions';

/** 卡片动作 → 闭环动作 + 成功提示键 */
function resolveToastKey(kind: Decision['kind'], action: string): string | null {
  if (kind === 'approval') {
    if (action === 'accept') return 'decision.toast.approved';
    if (action === 'reject') return 'decision.toast.rejected';
    return null;
  }
  if (kind === 'acceptance') {
    if (action === 'accept') return 'decision.toast.passed';
    if (action === 'reject') return 'decision.toast.failed';
    if (action === 'waive') return 'decision.toast.waived';
    return null;
  }
  // 建议类提案
  if (kind === 'plan' && action === 'accept') return 'decision.toast.planApplied';
  if (kind === 'assignment' && action === 'accept') return 'decision.toast.assignmentApplied';
  if (kind === 'resolution') {
    if (action === 'accept') return 'decision.toast.completed';
    if (action === 'cancel') return 'decision.toast.cancelled';
  }
  if (kind === 'spend' && action === 'accept') return 'decision.toast.budgetUpdated';
  if (kind === 'clarify' && action === 'accept') return 'decision.toast.clarified';
  return null;
}

export function useDecisionActions() {
  const { t } = useTranslation();
  const resolve = useResolveDecision();

  const handleAction = async (
    action: string,
    decision: Decision,
    opts?: { reason?: string; answer?: string },
  ) => {
    // 微调/替代方案：重提案写路径待 AI 编排接入，先显式提示
    if (action === 'adjust' || action === 'alternative') {
      toast.info(t('decision.action.pendingSupport'));
      return;
    }
    try {
      await resolve.mutateAsync({
        decision,
        action: action as DecisionResolutionAction,
        reason: opts?.reason,
        answer: opts?.answer,
      });
      const key = resolveToastKey(decision.kind, action);
      if (key) toast.success(t(key));
    } catch (err) {
      toast.error(t('decision.toast.error', {
        message: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  const busyId = resolve.isPending && resolve.variables
    ? resolve.variables.decision.id
    : null;

  return { handleAction, busyId };
}
