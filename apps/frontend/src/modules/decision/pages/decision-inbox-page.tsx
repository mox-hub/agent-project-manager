/**
 * 决策收件箱 —— 卡片文法的主投影（双栏 master-detail）。
 * 布局：PageShell > 左窄栏（快捷刷新 + blocking/advisory 分组列表）> 右栏完整 DecisionCard 详情。
 * 动作经 useResolveDecision 接入各来源既有闭环端点；「沉默 ≠ 同意」48h 升级提示留在左栏底部。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Inbox, RefreshCw, Zap } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { AsyncState } from '@/components/ui/async-state';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonText } from '@/components/ui/skeleton';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import type { Decision } from '@/shared/decision-card/types';
import {
  usePendingDecisions,
} from '@/modules/decision/hooks/use-decisions';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';
import { cn } from '@/lib/utils';

function DecisionRowSkeleton() {
  return (
    <div className="space-y-2 px-3 py-2.5">
      <SkeletonText lines={1} className="w-2/3" />
      <SkeletonText lines={1} className="w-1/3" />
    </div>
  );
}

export function DecisionInboxPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = usePendingDecisions();
  const { handleAction, busyId } = useDecisionActions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const blocking = useMemo(() => items.filter((d) => d.urgency === 'blocking'), [items]);
  const advisory = useMemo(() => items.filter((d) => d.urgency === 'advisory'), [items]);

  const selected = useMemo(
    () => items.find((d) => d.id === selectedId) ?? null,
    [items, selectedId],
  );

  const renderGroup = (group: Decision[], header: 'blocking' | 'advisory') => {
    if (group.length === 0) return null;
    return (
      <div className="mb-1">
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium',
            header === 'blocking' ? 'text-accent-red' : 'text-content-text-secondary',
          )}
        >
          {header === 'blocking' ? (
            <Zap className="size-3.5" />
          ) : (
            <Inbox className="size-3.5" />
          )}
          <span>
            {header === 'blocking'
              ? t('decision.section.blocking')
              : t('decision.section.advisoryCount', { n: group.length })}
          </span>
        </div>
        {group.map((decision) => {
          const selectedRow = decision.id === selectedId;
          return (
            <button
              key={decision.id}
              type="button"
              className={cn(
                'flex w-full items-start gap-2 border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent',
                selectedRow && 'bg-accent text-accent-foreground',
              )}
              onClick={() => setSelectedId(decision.id)}
            >
              <div
                className={cn(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                  decision.urgency === 'blocking'
                    ? 'bg-accent-red-light'
                    : 'bg-muted',
                )}
              >
                {decision.urgency === 'blocking' ? (
                  <Zap className="size-3.5 text-accent-red" />
                ) : (
                  <Inbox className="size-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm',
                    selectedRow ? 'text-accent-foreground' : 'text-foreground',
                  )}
                >
                  {decision.title}
                </p>
                <p
                  className={cn(
                    'mt-0.5 truncate text-xs',
                    selectedRow ? 'text-accent-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {decision.taskTitle || decision.projectName || decision.kind}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <PageShell className="overflow-hidden p-0" aiPage="decision.inbox">
      <div className="flex h-full min-h-0">
        {/* ── 左栏：快捷刷新 + 待决分组列表 ── */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-foreground">
                {t('decision.title')}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                aria-label={t('common.refresh')}
                title={t('common.refresh')}
                onClick={() => refetch()}
              >
                <RefreshCw size={14} className="text-muted-foreground" />
              </Button>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t('decision.metrics.pending')} {data?.total ?? 0}
              </span>
              <span className="text-accent-red">
                {t('decision.metrics.blocking')} {data?.blocking ?? 0}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <AsyncState
              isLoading={isLoading}
              isEmpty={!isLoading && items.length === 0}
              error={error?.message ?? null}
              onRetry={() => refetch()}
              loadingFallback={
                <div>
                  <DecisionRowSkeleton />
                  <DecisionRowSkeleton />
                  <DecisionRowSkeleton />
                </div>
              }
              emptyTitle={t('decision.empty.title')}
              emptyDescription={t('decision.empty.description')}
            >
              <div className="pt-1">
                {renderGroup(blocking, 'blocking')}
                {renderGroup(advisory, 'advisory')}
              </div>
            </AsyncState>
          </div>

          {/* 沉默 ≠ 同意：48h 无人处理升级进日报，绝不静默通过 */}
          <div className="border-t border-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-11 text-content-text-muted">
              <Clock className="size-3 shrink-0" />
              <span className="truncate">{t('decision.digestNote')}</span>
            </div>
          </div>
        </aside>

        {/* ── 右栏：选中决策的完整卡片（动作栏可用） ── */}
        <section className="flex min-w-0 flex-1 flex-col overflow-auto">
          {selected ? (
            <div className="mx-auto w-full max-w-2xl px-6 py-6">
              <DecisionCard
                decision={selected}
                busy={busyId === selected.id}
                onAction={handleAction}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title={t('decision.detail.emptyTitle')}
                description={t('decision.detail.emptyHint')}
              />
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
