/**
 * 「待你决定」卡片堆 —— 采用实体手卡卡片堆叠（DecisionDeckStack）伴随式呈现。
 * 支持 3D 翻面、印章盖下、滑出动效与顺畅批阅；与收件箱同源共享动作与缓存。
 */
import { SkeletonText } from '@/components/ui/skeleton';
import { DecisionDeckStack } from '@/shared/decision-card/decision-deck-stack';
import type { Decision } from '@/shared/decision-card/types';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';

export function AssistantDecisionStrip({
  items,
  loading,
  onAllDone,
  onIndexChange,
}: {
  items: Decision[];
  loading?: boolean;
  onAllDone?: () => void;
  onIndexChange?: (current: number, total: number) => void;
}) {
  const { handleAction, busyId } = useDecisionActions();

  if (!loading && items.length === 0) return null;

  if (loading) {
    return (
      <div className="assistant-decision-loading flex w-full flex-col items-center justify-center space-y-3 rounded-2xl border border-border bg-muted/20 p-6">
        <SkeletonText lines={1} className="w-1/2" />
        <SkeletonText lines={3} className="w-full" />
        <SkeletonText lines={2} className="w-3/4" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center" data-ai-component="assistant.decision-deck">
      <DecisionDeckStack
        decisions={items}
        busyId={busyId}
        onAction={handleAction}
        onAllDone={onAllDone}
        onIndexChange={onIndexChange}
        compact={true}
      />
    </div>
  );
}
