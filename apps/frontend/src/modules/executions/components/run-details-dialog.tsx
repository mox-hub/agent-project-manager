/**
 * 运行详情面板 —— CLI 工具运行与内置 AI 助理运行共用的大号 Dialog。
 * 头部（状态/触发来源/用时/tokens/费用 + 运行详情 Popover）→ 产出 chips →
 * 模型/工具时间轴 → 可搜索事件流。数据：run 详情（steps 优先）+ events 流水轮询。
 */
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleDollarSign,
  Coins,
  FileOutput,
  FolderKanban,
  Info,
  Package,
  SquareTerminal,
  TriangleAlert,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  isTerminalRunStatus,
  useExecutionRunDetail,
  useExecutionRunEvents,
  type ExecutionRunStatus,
} from '../api/execution-api';
import {
  aggregateArtifacts,
  buildRunEventEntries,
  formatCost,
  formatRunDuration,
  formatTokens,
  resolveTriggerSource,
  type RunDetailsData,
  type TriggerSource,
} from './run-details-format';
import { RunEventList } from './run-event-list';
import { RunTimeline } from './run-timeline';

type PillTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_META: Record<string, { tone: PillTone; i18n: string }> = {
  draft: { tone: 'default', i18n: 'draft' },
  planned: { tone: 'default', i18n: 'planned' },
  in_progress: { tone: 'info', i18n: 'in_progress' },
  pending_approval: { tone: 'warning', i18n: 'pending_approval' },
  completed: { tone: 'success', i18n: 'completed' },
  failed: { tone: 'danger', i18n: 'failed' },
  blocked: { tone: 'danger', i18n: 'blocked' },
  superseded: { tone: 'default', i18n: 'superseded' },
};

const TRIGGER_I18N: Record<TriggerSource, string> = {
  assistant: 'runDetails.trigger.assistant',
  cli: 'runDetails.trigger.cli',
  task: 'runDetails.trigger.task',
  api: 'runDetails.trigger.api',
};

function StatusPillFor({ status }: { status: ExecutionRunStatus }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status] ?? { tone: 'default' as PillTone, i18n: status };
  return (
    <StatusPill tone={meta.tone}>{t(`runDetails.status.${meta.i18n}`)}</StatusPill>
  );
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-content-text-muted">{label}</span>
      <span className="min-w-0 break-all text-right text-content-text">{value}</span>
    </div>
  );
}

function RunDetailsPopover({ data }: { data: RunDetailsData }) {
  const { t } = useTranslation();
  const binding = data.bindings?.[0];
  const cost = formatCost(data.totalCost);
  const tokens = formatTokens(data.totalTokens);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-11 text-content-text-secondary hover:bg-muted/60"
          />
        }
      >
        <Info className="size-3.5" />
        {t('runDetails.title')}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2.5 p-4">
        <p className="text-sm font-medium">{t('runDetails.title')}</p>
        <DetailRow
          label={t('runDetails.details.provider')}
          value={binding?.providerId ?? '—'}
        />
        <DetailRow
          label={t('runDetails.details.runtime')}
          value={binding?.runtimeId ?? '—'}
        />
        <DetailRow
          label={t('runDetails.details.mode')}
          value={
            binding
              ? t('runDetails.details.modeDaemon')
              : t('runDetails.details.modeLocal')
          }
        />
        <DetailRow
          label={t('runDetails.details.workdir')}
          value={binding?.workspaceRoot ?? '—'}
        />
        <div className="h-px bg-border" />
        <DetailRow
          label={t('runDetails.details.created')}
          value={formatDateTime(data.createdAt)}
        />
        <DetailRow
          label={t('runDetails.details.started')}
          value={formatDateTime(data.startedAt)}
        />
        <DetailRow
          label={t('runDetails.details.completed')}
          value={formatDateTime(data.completedAt ?? data.terminatedAt)}
        />
        <div className="h-px bg-border" />
        <DetailRow
          label={t('runDetails.details.totalTokens')}
          value={tokens ?? '—'}
        />
        <DetailRow label={t('runDetails.details.cost')} value={cost ?? '—'} />
      </PopoverContent>
    </Popover>
  );
}

function ArtifactChips({ data }: { data: RunDetailsData }) {
  const { t } = useTranslation();
  const summary = useMemo(
    () => aggregateArtifacts(data.artifacts ?? []),
    [data.artifacts],
  );
  if (summary.total === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
      <span className="flex items-center gap-1 text-11 text-content-text-muted">
        <FileOutput className="size-3.5" />
        {t('runDetails.outputs')}
      </span>
      {summary.files > 0 ? (
        <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-11">
          <Package className="size-3 text-content-text-muted" />
          {t('runDetails.outputsFiles', { count: summary.files })}
        </span>
      ) : null}
      {summary.commands > 0 ? (
        <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-11">
          <SquareTerminal className="size-3 text-content-text-muted" />
          {t('runDetails.outputsCommands', { count: summary.commands })}
        </span>
      ) : null}
      {summary.others > 0 ? (
        <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-11">
          <Package className="size-3 text-content-text-muted" />
          {t('runDetails.outputsArtifacts', { count: summary.others })}
        </span>
      ) : null}
    </div>
  );
}

export function RunDetailsDialog({
  runId,
  open,
  onOpenChange,
}: {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const detail = useExecutionRunDetail(open ? runId : null);
  const run = detail.data;
  const stillActive = !run || !isTerminalRunStatus(run.status);
  const events = useExecutionRunEvents(runId, open && stillActive);

  const data: RunDetailsData | null = useMemo(
    () => (run ? { ...run, events: events.data ?? [] } : null),
    [run, events.data],
  );
  const entries = useMemo(
    () => (data ? buildRunEventEntries(data) : []),
    [data],
  );

  // 时间窗右端纯函数推导：run 终态时间与最后 step 时间取晚者（渲染期禁 Date.now）
  const windowStart = data?.startedAt ?? data?.createdAt ?? null;
  const windowEnd = useMemo(() => {
    if (!data) return null;
    const candidates = [
      data.completedAt,
      data.terminatedAt,
      ...(data.steps ?? []).map(
        (step) => step.completedAt ?? step.startedAt ?? null,
      ),
    ].filter((iso): iso is string => !!iso);
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, iso) => (iso > latest ? iso : latest));
  }, [data]);

  const duration = data ? formatRunDuration(data) : null;
  const tokens = data ? formatTokens(data.totalTokens) : null;
  const cost = data ? formatCost(data.totalCost) : null;
  const subjectLabel = data
    ? data.subjectName ?? t(`runDetails.subject.${data.subjectType}`)
    : null;
  const hasTimeline =
    (data?.steps?.length ?? 0) > 0 && !!windowStart && !!windowEnd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        keepDefaultWidth={false}
        className="flex h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0"
      >
        {!data ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {detail.isLoading ? (
              <>
                <Spinner className="text-accent-blue" />
                <Skeleton className="h-4 w-40" />
              </>
            ) : (
              <>
                <TriangleAlert className="size-6 text-content-text-muted" />
                <p className="text-xs text-content-text-muted">
                  {t('runDetails.loadFailed')}
                </p>
              </>
            )}
            <DialogTitle className="sr-only">{t('runDetails.title')}</DialogTitle>
          </div>
        ) : (
          <>
            {/* 头部：状态 + 目标 + 元信息 + tokens/费用 + 详情 Popover */}
            <div className="shrink-0 space-y-1.5 border-b p-4 pr-12">
              <div className="flex items-center gap-2">
                <StatusPillFor status={data.status} />
                <DialogTitle className="min-w-0 truncate text-sm font-medium">
                  {data.goal}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-3 text-11 text-content-text-muted">
                {subjectLabel ? (
                  <span className="flex items-center gap-1">
                    <FolderKanban className="size-3" />
                    {subjectLabel}
                  </span>
                ) : null}
                <span>{t(TRIGGER_I18N[resolveTriggerSource(data)])}</span>
                {duration ? (
                  <span>
                    {t('runDetails.duration')} {duration}
                  </span>
                ) : null}
                <span className="ml-auto flex items-center gap-3">
                  {tokens ? (
                    <span className="flex items-center gap-1 text-content-text-secondary">
                      <Coins className="size-3" />
                      {tokens}
                    </span>
                  ) : null}
                  {cost ? (
                    <span className="flex items-center gap-1 text-content-text-secondary">
                      <CircleDollarSign className="size-3" />
                      {cost}
                    </span>
                  ) : null}
                  <RunDetailsPopover data={data} />
                </span>
              </div>
            </div>

            <ArtifactChips data={data} />

            {hasTimeline && windowStart && windowEnd ? (
              <div className="shrink-0 border-b px-4 py-3">
                <RunTimeline
                  steps={data.steps}
                  windowStart={windowStart}
                  windowEnd={windowEnd}
                />
              </div>
            ) : null}

            <RunEventList
              entries={entries}
              windowStart={windowStart ?? undefined}
              className="min-h-0 flex-1"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
