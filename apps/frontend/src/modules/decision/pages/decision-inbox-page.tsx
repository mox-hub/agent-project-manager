/**
 * 决策收件箱（占位页）—— 卡片文法的主投影。
 * 布局：PageShell > PageHeader（计数胶囊 + 刷新）> 分组卡片流（阻断优先，排队其次）。
 * 视觉与交互精修待设计稿落地；动作分发的决议闭环（approval/acceptance 端点）为下一里程碑。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { PageShell } from '@/components/ui/page-shell';
import { AsyncState } from '@/components/ui/async-state';
import { SkeletonText } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { toast } from '@/components/ui/toast';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import type { Decision, DecisionCardAction } from '@/shared/decision-card/types';
import { usePendingDecisions } from '@/modules/decision/hooks/use-decisions';

function DecisionCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <SkeletonText lines={1} className="w-1/3" />
      <SkeletonText lines={2} />
      <SkeletonText lines={1} className="w-2/3" />
    </div>
  );
}

function DecisionSection({
  title,
  tone,
  hint,
  items,
  busyId,
  onAction,
}: {
  title: string;
  tone: 'danger' | 'warning';
  hint: string;
  items: Decision[];
  busyId: string | null;
  onAction: (action: DecisionCardAction, decision: Decision) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-content-text">{title}</h2>
        <StatusPill tone={tone}>{items.length}</StatusPill>
        <span className="text-11 text-content-text-muted">{hint}</span>
      </div>
      <div className="space-y-3">
        {items.map((decision) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            // 占位阶段提交态只到卡粒度；决议闭环接线后按 mutation pending 细化
            busyAction={busyId === decision.id ? 'accept' : null}
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
  // 占位：动作提交态按卡记录；决议闭环接线后改为 mutation pending
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleAction = (action: DecisionCardAction, decision: Decision) => {
    setBusyId(decision.id);
    // TODO: 决议闭环接线 —— approval → resolveApproval，acceptance → acceptance review
    toast.info(t('decision.action.toast', { action: t(`decision.action.${action}`) }));
    setBusyId(null);
  };

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
      <div className="flex-1 overflow-auto p-6">
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
              title={t('decision.section.blocking')}
              tone="danger"
              hint={t('decision.section.blockingHint')}
              items={blocking}
              busyId={busyId}
              onAction={handleAction}
            />
            <DecisionSection
              title={t('decision.section.advisory')}
              tone="warning"
              hint={t('decision.section.advisoryHint')}
              items={advisory}
              busyId={busyId}
              onAction={handleAction}
            />
          </div>
        </AsyncState>
      </div>
    </PageShell>
  );
}
