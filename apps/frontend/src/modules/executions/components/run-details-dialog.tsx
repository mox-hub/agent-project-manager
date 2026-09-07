/**
 * 运行详情面板 —— CLI 工具运行与内置 AI 助理运行共用的大号 Dialog（对照运行详情设计稿）。
 * 头部（状态/目标/tokens/费用）→ 错误横幅 → 产出 chips → 时间轴 →
 * 主区（事件流/原始日志页签）+ 右栏（步骤详情 / 运行信息面板）。
 * 数据：run 详情（steps 优先）+ events 流水轮询 + token 原始日志轮询。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, FolderKanban, Info, TriangleAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  isTerminalRunStatus,
  useExecutionRunDetail,
  useExecutionRunEvents,
  useExecutionRunLogs,
  type ExecutionRunStatus,
} from '../api/execution-api';
import {
  aggregateArtifacts,
  buildRunEventEntries,
  extractRunError,
  formatCost,
  formatOffset,
  formatRunDuration,
  formatTokens,
  pseudoStepsFromEvents,
  resolveTriggerSource,
  type RunDetailsData,
  type RunEventEntry,
  type TriggerSource,
} from './run-details-format';
import { RunEventList } from './run-event-list';
import { RunInfoPanel } from './run-info-panel';
import { RunTimeline } from './run-timeline';
import { StepDetailPanel } from './step-detail-panel';

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

/** 右栏视图：none = 无面板；info = 运行信息；step = 步骤详情（带条目）。随 runId 记忆。 */
interface PanelView {
  runId: string;
  kind: 'none' | 'info' | 'step';
  entry: RunEventEntry | null;
}

const NO_PANEL: PanelView = { runId: '', kind: 'none', entry: null };

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
  // 视图随 runId 记忆：切换到别的 run 时回落事件流（渲染期禁 effect setState，用比较推导）
  const [rawView, setRawView] = useState<{ runId: string; on: boolean }>({
    runId: '',
    on: false,
  });
  const [panel, setPanel] = useState<PanelView>(NO_PANEL);
  const detail = useExecutionRunDetail(open ? runId : null);
  const run = detail.data;
  const stillActive = !run || !isTerminalRunStatus(run.status);
  const events = useExecutionRunEvents(runId, open && stillActive);
  const showRaw = rawView.runId === runId && rawView.on;
  const logs = useExecutionRunLogs(open && showRaw ? runId : null, stillActive);

  const data: RunDetailsData | null = useMemo(
    () => (run ? { ...run, events: events.data ?? [] } : null),
    [run, events.data],
  );
  const entries = useMemo(
    () => (data ? buildRunEventEntries(data) : []),
    [data],
  );

  // 时间窗右端纯函数推导：run 终态时间与最后 step/事件时间取晚者（渲染期禁 Date.now）
  const windowStart = data?.startedAt ?? data?.createdAt ?? null;
  const windowEnd = useMemo(() => {
    if (!data) return null;
    const candidates = [
      data.completedAt,
      data.terminatedAt,
      ...(data.steps ?? []).map(
        (step) => step.completedAt ?? step.startedAt ?? null,
      ),
      ...(data.events ?? []).map(
        (event) => event.timestamp ?? event.createdAt ?? null,
      ),
    ].filter((iso): iso is string => !!iso);
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, iso) => (iso > latest ? iso : latest));
  }, [data]);

  // 时间轴数据：steps 表为空（daemon 路径）时用事件流水合成伪步骤兜底
  const timelineSteps = useMemo(() => {
    if (!data) return [];
    return data.steps.length > 0
      ? data.steps
      : pseudoStepsFromEvents(data.id, data.events ?? []);
  }, [data]);

  const artifactSummary = useMemo(
    () => (data ? aggregateArtifacts(data.artifacts ?? []) : null),
    [data],
  );

  const duration = data ? formatRunDuration(data) : null;
  const tokens = data ? formatTokens(data.totalTokens) : null;
  const cost = data ? formatCost(data.totalCost) : null;
  const subjectLabel = data
    ? data.subjectName ?? t(`runDetails.subject.${data.subjectType}`)
    : null;
  const provider = data?.bindings?.[0]?.providerId ?? null;
  const runError = data ? extractRunError(data) : undefined;
  const hasTimeline = timelineSteps.length > 0 && !!windowStart && !!windowEnd;

  // 右栏只对当前 run 生效
  const activePanel: PanelView =
    panel.runId === runId ? panel : NO_PANEL;

  const selectEntry = (entry: RunEventEntry | null) => {
    setPanel(
      entry
        ? { runId: runId ?? '', kind: 'step', entry }
        : { runId: runId ?? '', kind: 'none', entry: null },
    );
  };
  const toggleInfo = () => {
    setPanel((prev) => {
      const showInfo = !(prev.runId === runId && prev.kind === 'info');
      return {
        runId: runId ?? '',
        kind: showInfo ? 'info' : 'none',
        entry: null,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        keepDefaultWidth={false}
        className="flex h-[85vh] max-w-5xl flex-col gap-0 overflow-hidden p-0"
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
                {provider ? (
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 font-mono">
                    {provider}
                  </span>
                ) : null}
                <span>{t(TRIGGER_I18N[resolveTriggerSource(data)])}</span>
                {duration ? (
                  <span>
                    {t('runDetails.duration')} {duration}
                  </span>
                ) : null}
                <span className="ml-auto flex items-center gap-2">
                  {artifactSummary && artifactSummary.files > 0 ? (
                    <span className="hidden whitespace-nowrap text-11 md:inline">
                      {t('runDetails.outputsFiles', { count: artifactSummary.files })}
                    </span>
                  ) : null}
                  {artifactSummary && artifactSummary.commands > 0 ? (
                    <span className="hidden whitespace-nowrap text-11 md:inline">
                      {t('runDetails.outputsCommands', { count: artifactSummary.commands })}
                    </span>
                  ) : null}
                  {tokens ? (
                    <span className="flex items-center gap-1 rounded-full bg-accent-orange-light px-2 py-0.5 text-11 font-semibold text-accent-orange">
                      <Coins className="size-3" />
                      {tokens}
                    </span>
                  ) : null}
                  {cost ? (
                    <span className="rounded-full bg-accent-green-light px-2 py-0.5 text-11 font-semibold text-accent-green">
                      {cost}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={toggleInfo}
                    title={t('runDetails.title')}
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                      activePanel.kind === 'info'
                        ? 'bg-primary/10 text-primary'
                        : 'text-content-text-muted hover:bg-muted hover:text-content-text',
                    )}
                  >
                    <Info className="size-4" />
                  </button>
                </span>
              </div>
            </div>

            {/* 错误横幅：失败/阻断 run 的错误信息直达 */}
            {runError ? (
              <div className="flex shrink-0 items-start gap-2 border-b bg-accent-red-light/60 px-4 py-2">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-accent-red" />
                <p className="min-w-0 break-all font-mono text-11 text-accent-red">
                  {runError}
                </p>
              </div>
            ) : null}

            {hasTimeline && windowStart && windowEnd ? (
              <div className="shrink-0 border-b px-4 py-3">
                <RunTimeline
                  steps={timelineSteps}
                  windowStart={windowStart}
                  windowEnd={windowEnd}
                />
              </div>
            ) : null}

            {/* 事件流 / 原始日志 视图切换 */}
            <div className="flex shrink-0 items-center gap-1 border-b px-4 py-1.5">
              {(
                [
                  ['events', t('runDetails.tabEvents')],
                  ['raw', t('runDetails.tabRawLog')],
                ] as const
              ).map(([key, label]) => {
                const active = (key === 'raw') === showRaw;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRawView({ runId: runId ?? '', on: key === 'raw' })}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-11 transition-colors',
                      active
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              {showRaw && stillActive ? (
                <span className="ml-auto flex items-center gap-1 text-10 text-content-text-muted">
                  <Spinner className="size-3" />
                  {t('runDetails.rawLogStreaming')}
                </span>
              ) : null}
            </div>

            {/* 主区：左列表 + 右详情/信息面板 */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {showRaw ? (
                  <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-3">
                    {(logs.data?.length ?? 0) === 0 ? (
                      <p className="text-xs text-content-text-muted">
                        {t('runDetails.rawLogEmpty')}
                      </p>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words font-mono text-11 leading-relaxed text-content-text">
                        {(logs.data ?? [])
                          .map((l) =>
                            l.stream === 'stderr' ? `[stderr] ${l.summary}` : l.summary,
                          )
                          .join('')}
                      </pre>
                    )}
                  </div>
                ) : (
                  <RunEventList
                    entries={entries}
                    windowStart={windowStart ?? undefined}
                    selectedId={activePanel.kind === 'step' ? activePanel.entry?.id : null}
                    onSelect={selectEntry}
                    className="min-h-0 flex-1"
                  />
                )}
              </div>

              {activePanel.kind === 'step' && activePanel.entry ? (
                <StepDetailPanel
                  entry={activePanel.entry}
                  offsetLabel={
                    entryOffsetLabel(activePanel.entry, windowStart) ?? undefined
                  }
                  onClose={() => selectEntry(null)}
                />
              ) : null}

              {activePanel.kind === 'info' ? (
                <RunInfoPanel data={data} onClose={toggleInfo} />
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** 条目相对运行起点的偏移标签（详情面板头部展示） */
function entryOffsetLabel(
  entry: RunEventEntry,
  windowStart: string | null,
): string | null {
  if (!entry.at || !windowStart) return null;
  return formatOffset(entry.at, windowStart);
}
