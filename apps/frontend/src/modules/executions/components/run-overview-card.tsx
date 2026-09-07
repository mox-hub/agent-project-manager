/**
 * 运行概览卡 —— 列表行「查看概览」弹出的轻量卡片（对照 AgentRunsPage RunCardModal）。
 * 状态色条 + 触发/用时 + 委托人→执行人 + 统计格 + 步骤构成条 + provider/mode 页脚。
 * 数据复用 run 详情 + 事件流水 hooks（打开才拉取）。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Link2, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useExecutionRunDetail,
  useExecutionRunEvents,
  type ExecutionRunRecord,
} from '../api/execution-api';
import {
  aggregateArtifacts,
  buildRunEventEntries,
  formatCost,
  formatRunDuration,
  formatTokens,
  resolveTriggerSource,
  summarizeEntryKinds,
  type RunEventKind,
} from './run-details-format';

const TRIGGER_I18N: Record<string, string> = {
  assistant: 'runDetails.trigger.assistant',
  cli: 'runDetails.trigger.cli',
  task: 'runDetails.trigger.task',
  api: 'runDetails.trigger.api',
};

/** 步骤构成条配色（与事件列表图标底色同族） */
const KIND_BAR_CLASS: Record<RunEventKind, string> = {
  tool: 'bg-accent-blue',
  thinking: 'bg-accent-purple',
  result: 'bg-accent-green',
  approval: 'bg-accent-yellow',
  error: 'bg-accent-red',
  user: 'bg-accent-purple-light',
  prompt: 'bg-accent-purple',
  context: 'bg-accent-blue-light',
  file: 'bg-accent-green',
  usage: 'bg-accent-orange',
  assistant: 'bg-accent-green-light',
  status: 'bg-muted-foreground/40',
};

const KIND_LABEL_KEY: Partial<Record<RunEventKind, string>> = {
  prompt: 'runDetails.filter.prompt',
  context: 'runDetails.filter.context',
  tool: 'runDetails.filter.tool',
  file: 'runDetails.filter.file',
  thinking: 'runDetails.filter.thinking',
  usage: 'runDetails.filter.usage',
  result: 'runDetails.filter.result',
  approval: 'runDetails.filter.approval',
  error: 'runDetails.filter.error',
};

const STATUS_STRIP_CLASS: Record<string, string> = {
  completed: 'bg-accent-green',
  in_progress: 'bg-accent-blue',
  failed: 'bg-accent-red',
  blocked: 'bg-accent-red',
  pending_approval: 'bg-accent-yellow',
  draft: 'bg-muted-foreground/40',
  planned: 'bg-muted-foreground/40',
  superseded: 'bg-muted-foreground/40',
};

function StatCell({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
      <div className={cn('text-sm font-bold', accent)}>{value}</div>
      <div className="mt-0.5 text-10 text-content-text-muted">{label}</div>
    </div>
  );
}

export function RunOverviewCard({
  run,
  open,
  onOpenChange,
}: {
  run: ExecutionRunRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const detail = useExecutionRunDetail(open ? run.id : null);
  const stillActive = detail.data
    ? !['completed', 'failed', 'blocked', 'superseded'].includes(detail.data.status)
    : true;
  const events = useExecutionRunEvents(open ? run.id : null, stillActive);

  const data = useMemo(
    () =>
      detail.data
        ? { ...detail.data, events: events.data ?? [] }
        : null,
    [detail.data, events.data],
  );
  const entries = useMemo(
    () => (data ? buildRunEventEntries(data) : []),
    [data],
  );
  const kinds = useMemo(() => summarizeEntryKinds(entries), [entries]);
  const artifactTotal = data
    ? aggregateArtifacts(data.artifacts ?? []).total
    : (run.artifactsCount ?? 0);
  const stepCount = entries.length || run.stepsCount || 0;

  const tokens = formatTokens(run.totalTokens);
  const cost = formatCost(run.totalCost);
  const duration = formatRunDuration(run);
  const provider = run.providerId ?? data?.bindings?.[0]?.providerId ?? null;
  const triggerKey = TRIGGER_I18N[resolveTriggerSource(run)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        keepDefaultWidth={false}
        className="overflow-hidden rounded-2xl p-0"
      >
        {/* 状态色条 */}
        <div className={cn('h-1 w-full', STATUS_STRIP_CLASS[run.status] ?? 'bg-muted-foreground/40')} />

        <div className="space-y-3 px-5 py-4">
          {/* 顶部：状态 + 目标 + 时间 */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <StatusPillFor status={run.status} />
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-11 text-content-text-muted">
                  {t(triggerKey)}
                </span>
              </div>
              <h3 className="truncate text-sm font-semibold">{run.goal}</h3>
              <p className="mt-0.5 text-12 text-content-text-muted">
                {run.project?.name ? `${run.project.name} · ` : ''}
                {duration ? `${t('runDetails.duration')} ${duration}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-md p-1.5 text-content-text-muted transition-colors hover:bg-muted hover:text-content-text"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* 委托 → 执行 */}
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent-purple-light text-accent-purple">
              <Bot className="size-3.5" />
            </span>
            <span className="text-12">
              {run.subjectName ?? t(`runDetails.subject.${run.subjectType}`)}
            </span>
            {provider ? (
              <span className="rounded-full bg-muted/60 px-2 py-0.5 font-mono text-10 text-content-text-muted">
                {provider}
              </span>
            ) : null}
          </div>

          {/* 统计格 */}
          <div className="grid grid-cols-4 gap-2">
            <StatCell
              value={tokens ?? '—'}
              label={t('runDetails.card.tokens')}
              accent="text-accent-orange"
            />
            <StatCell
              value={cost ?? '—'}
              label={t('runDetails.card.cost')}
              accent="text-accent-green"
            />
            <StatCell value={String(stepCount)} label={t('runDetails.card.steps')} />
            <StatCell value={String(artifactTotal)} label={t('runDetails.card.artifacts')} />
          </div>

          {/* 步骤构成条 */}
          {kinds.length > 0 ? (
            <div>
              <p className="mb-1.5 text-11 text-content-text-muted">
                {t('runDetails.card.breakdown')}
              </p>
              <div className="flex h-2 items-center gap-0.5 overflow-hidden rounded-full">
                {kinds.map(({ kind, count }) => (
                  <div
                    key={kind}
                    className={cn('h-full rounded-full', KIND_BAR_CLASS[kind])}
                    style={{ flex: count }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                {kinds.map(({ kind, count }) => (
                  <div key={kind} className="flex items-center gap-1">
                    <span className={cn('size-2 rounded-full', KIND_BAR_CLASS[kind])} />
                    <span className="text-10 text-content-text-muted">
                      {KIND_LABEL_KEY[kind]
                        ? t(KIND_LABEL_KEY[kind] as string)
                        : t(`runDetails.event.${kind}`)}{' '}
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : stepCount === 0 && stillActive ? (
            <div className="flex items-center gap-2 text-11 text-content-text-muted">
              <Skeleton className="h-2 w-40" />
              <span className="flex items-center gap-1">
                <Link2 className="size-3" />
                {t('runDetails.card.loading')}
              </span>
            </div>
          ) : null}

          {/* 页脚 */}
          <div className="flex items-center justify-between border-t pt-3 text-11 text-content-text-muted">
            <span className="truncate font-mono">{run.id}</span>
            <span className="shrink-0">
              {provider ?? '—'} ·{' '}
              {data?.bindings?.length
                ? t('runDetails.details.modeDaemon')
                : t('runDetails.details.modeLocal')}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusPillFor({ status }: { status: ExecutionRunRecord['status'] }) {
  const { t } = useTranslation();
  const tone =
    status === 'completed'
      ? 'success'
      : status === 'failed' || status === 'blocked'
        ? 'danger'
        : status === 'in_progress'
          ? 'info'
          : status === 'pending_approval'
            ? 'warning'
            : 'default';
  return <StatusPill tone={tone}>{t(`runDetails.status.${status}`)}</StatusPill>;
}
