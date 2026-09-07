/**
 * 「待你决定」卡片区 —— 与收件箱同源同动作：复用 DecisionCard 本体与
 * useDecisionActions（同一 resolve mutation），双边共享 query 缓存失效，
 * 收件箱里决议过的卡在这里同步消失。
 */
import { useTranslation } from 'react-i18next';
import { SkeletonText } from '@/components/ui/skeleton';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import type { Decision } from '@/shared/decision-card/types';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';

export function AssistantDecisionStrip({
  items,
  loading,
}: {
  items: Decision[];
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const { handleAction, busyId } = useDecisionActions();

  if (!loading && items.length === 0) return null;

  return (
    <section className="space-y-2" data-ai-component="assistant.decision-strip">
      <p className="px-1 text-11 font-semibold uppercase tracking-wider text-content-text-muted">
        {t('assistant.report.decideToday')}
      </p>
      <div className="space-y-3">
        {loading
          ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <SkeletonText lines={1} className="w-1/2" />
              <SkeletonText lines={2} />
            </div>
          )
          : items.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              busy={busyId === decision.id}
              onAction={handleAction}
            />
          ))}
      </div>
    </section>
  );
}
