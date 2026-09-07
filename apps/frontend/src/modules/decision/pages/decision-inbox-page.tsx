/**
 * 决策收件箱 —— 卡片文法的主投影（对齐设计稿 InboxPreview 分区文法）。
 * 布局：PageShell > PageHeader（计数胶囊 + 刷新）> 分区卡片流（阻断优先）> 48h 升级提示。
 * 动作经 useResolveDecision 接入各来源既有闭环端点；微调/替代方案待 AI 重提案写路径后接入。
 */
import { useTranslation } from 'react-i18next';
import { Clock, Inbox, RefreshCw, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { PageShell } from '@/components/ui/page-shell';
import { AsyncState } from '@/components/ui/async-state';
import { SkeletonText } from '@/components/ui/skeleton';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import type { Decision } from '@/shared/decision-card/types';
import {
  usePendingDecisions,
} from '@/modules/decision/hooks/use-decisions';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';

function DecisionCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <SkeletonText lines={1} className="w-1/3" />
      <SkeletonText lines={2} />
      <SkeletonText lines={1} className="w-2/3" />
    </div>
  );
}

/** 卡片动作 → 闭环动作 + 成功提示键；调整/替代方案暂无写路径，提示待接入（见 useDecisionActions） */
function DecisionSection({
  title,
  items,
  busyId,
  onAction,
  header,
}: {
  title: string;
  items: Decision[];
  busyId: string | null;
  onAction: (action: string, decision: Decision, opts?: { reason?: string }) => void;
  header: 'blocking' | 'advisory';
}) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div
        className={
          header === 'blocking'
            ? 'flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red-light/60 px-3 py-1.5 text-xs font-medium text-accent-red'
            : 'flex items-center gap-2 rounded-lg border border-border bg-content-bg-secondary/50 px-3 py-1.5 text-xs font-medium text-content-text-secondary'
        }
      >
        {header === 'blocking' ? (
          <Zap className="size-3" />
        ) : (
          <Inbox className="size-3" />
        )}
        <span>
          {header === 'blocking'
            ? t('decision.section.blocking')
            : t('decision.section.advisoryCount', { n: items.length })}
        </span>
        <span className="ml-auto text-11 text-content-text-muted">{title}</span>
      </div>
      <div className="space-y-3">
        {items.map((decision) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            busy={busyId === decision.id}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}

export function DecisionInboxPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = usePendingDecisions();
  const { handleAction, busyId } = useDecisionActions();

  const items = data?.items ?? [];
  const blocking = items.filter((d) => d.urgency === 'blocking');
  const advisory = items.filter((d) => d.urgency === 'advisory');

  return (
    <PageShell aiPage="decision.inbox">
      <PageHeader
        aiId="decision.inbox"
        title={t('decision.title')}
        icon={Inbox}
        iconColor="text-accent-orange"
        metrics={[
          { id: 'pending', label: t('decision.metrics.pending'), value: data?.total ?? 0 },
          { id: 'blocking', label: t('decision.metrics.blocking'), value: data?.blocking ?? 0 },
          { id: 'advisory', label: t('decision.metrics.advisory'), value: data?.advisory ?? 0 },
        ]}
        actions={
          <HeaderActionButton
            icon={RefreshCw}
            label={t('common.refresh')}
            onClick={() => refetch()}
          />
        }
      />
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <AsyncState
          isLoading={isLoading}
          isEmpty={!isLoading && items.length === 0}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          loadingFallback={
            <div className="w-full space-y-3">
              <DecisionCardSkeleton />
              <DecisionCardSkeleton />
              <DecisionCardSkeleton />
            </div>
          }
          emptyTitle={t('decision.empty.title')}
          emptyDescription={t('decision.empty.description')}
        >
          <div className="w-full space-y-6">
            <DecisionSection
              header="blocking"
              title={t('decision.section.blockingHint')}
              items={blocking}
              busyId={busyId}
              onAction={handleAction}
            />
            <DecisionSection
              header="advisory"
              title={t('decision.section.advisoryHint')}
              items={advisory}
              busyId={busyId}
              onAction={handleAction}
            />
            {/* 沉默 ≠ 同意：48h 无人处理升级进日报，绝不静默通过 */}
            <div className="flex items-center gap-2 px-1 text-11 text-content-text-muted">
              <Clock className="size-3 shrink-0" />
              <span>{t('decision.digestNote')}</span>
            </div>
          </div>
        </AsyncState>
      </div>
    </PageShell>
  );
}
