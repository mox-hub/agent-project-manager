/**
 * Workflow 运行面板（CAP-S-03 呈现层，ZCode 工作流卡三形态复刻）。
 * 表头种类词（运行中/已完成/等待确认/已失败/已取消）+ 阶段时间线 +
 * 人工确认卡 + 产物/输出 + 四格统计（时间/阶段/节点执行/子代理）。
 * v1 run（无 journal）退化为表头+确认卡+输出的简卡形态。
 * 数据经 useWorkflowRun 轮询/socket 失效自动刷新。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  CircleDashed,
  FileText,
  PauseCircle,
  Square,
  UserCheck,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import {
  useCancelWorkflow,
  useResumeWorkflow,
  useWorkflowRun,
} from '../hooks/use-workflows';
import {
  buildRunView,
  splitDuration,
  type V2NodeSummary,
} from './run-view/build-run-view';
import { WorkflowRunTimeline } from './workflow-run-timeline';

const RUN_KIND_META: Record<
  string,
  { icon: LucideIcon; tone: string; labelKey: string }
> = {
  running: { icon: CircleDashed, tone: 'text-accent-yellow', labelKey: 'workflow.runPanel.kindRunning' },
  succeeded: { icon: CheckCircle2, tone: 'text-accent-green', labelKey: 'workflow.runPanel.kindSucceeded' },
  failed: { icon: XCircle, tone: 'text-accent-red', labelKey: 'workflow.runPanel.kindFailed' },
  suspended: { icon: PauseCircle, tone: 'text-accent-yellow', labelKey: 'workflow.runPanel.kindSuspended' },
  cancelled: { icon: XCircle, tone: 'text-muted-foreground', labelKey: 'workflow.runPanel.kindCancelled' },
};

/** 成功输出里识别文档回流产物（agent 节点落库后的最小形状） */
interface StepsOutput {
  documentId: string;
  title?: string;
}

function collectArtifacts(
  output: Record<string, unknown> | null | undefined,
): Array<StepsOutput & { key: string }> {
  const steps = (output as { steps?: Record<string, unknown> } | null | undefined)?.steps;
  if (!steps || typeof steps !== 'object') return [];
  const found: Array<StepsOutput & { key: string }> = [];
  for (const [key, value] of Object.entries(steps)) {
    const record = value as { documentId?: unknown; title?: unknown } | null;
    if (record && typeof record === 'object' && typeof record.documentId === 'string') {
      found.push({
        key,
        documentId: record.documentId,
        title: typeof record.title === 'string' ? record.title : record.documentId,
      });
    }
  }
  return found;
}

function StatsRow({
  view,
}: {
  view: ReturnType<typeof buildRunView>;
}) {
  const { t } = useTranslation();
  const { m, s } = splitDuration(view.stats.durationMs);
  const durationText =
    view.stats.durationMs === null
      ? '—'
      : m > 0
        ? t('workflow.runPanel.stats.duration', { m, s })
        : t('workflow.runPanel.stats.durationShort', { s });
  const cells = [
    { value: durationText, label: t('workflow.runPanel.stats.time') },
    { value: String(view.stats.phases || '—'), label: t('workflow.runPanel.stats.phases') },
    { value: String(view.stats.nodeExecs || '—'), label: t('workflow.runPanel.stats.nodeExecs') },
    { value: String(view.stats.agents || '—'), label: t('workflow.runPanel.stats.agents') },
  ];
  return (
    <div className="grid grid-cols-4 gap-4 border-t border-border pt-3" data-ai="workflow.run.stats">
      {cells.map((cell) => (
        <div key={cell.label}>
          <p className="text-lg font-semibold leading-snug">{cell.value}</p>
          <p className="text-xs text-muted-foreground">{cell.label}</p>
        </div>
      ))}
    </div>
  );
}

export function WorkflowRunPanel({
  runId,
  onClose,
}: {
  runId: string;
  /** 关闭面板（清除选中 run，回定义视图） */
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: run, isLoading } = useWorkflowRun(runId);
  const resume = useResumeWorkflow();
  const cancel = useCancelWorkflow();
  const [note, setNote] = useState('');

  if (isLoading || !run) return <Skeleton  />;

  const isV2Run = run.engineVersion === 2;
  const meta = RUN_KIND_META[run.status] ?? RUN_KIND_META.running;
  const KindIcon = meta.icon;
  const nodeRuns = run.nodeRuns ?? [];
  const events = run.events ?? [];
  const waiting = run.waitingApproval;
  const output = run.output as { error?: string } | null | undefined;
  const cancellable = ['running', 'suspended'].includes(run.status);
  const activeAgents = nodeRuns.filter((n) => n.status === 'running').length;
  const artifacts = collectArtifacts(run.output);
  const stepsOutput = (
    run.output as { steps?: Record<string, unknown> } | null | undefined
  )?.steps;
  const view = buildRunView(
    (run.graphSummary ?? null) as unknown as V2NodeSummary[] | null,
    nodeRuns,
    run,
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-card p-4 motion-enter"
      data-ai="workflow.run.panel"
    >
      {/* 表头：种类词 + 名称 + run 胶囊 + 汇总 detail + 动作 */}
      <div className="flex items-center gap-2">
        <KindIcon
          className={cn('size-4 shrink-0', meta.tone, run.status === 'running' && 'animate-spin')}
          aria-hidden
        />
        <span className="shrink-0 text-sm font-medium">{t(meta.labelKey)}</span>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {run.workflow?.name ?? ''}
        </span>
        <StatusPill tone="default">
          <code className="text-3xs">{run.id.slice(0, 12)}…</code>
        </StatusPill>
        {isV2Run ? (
          <Badge variant="secondary" fontSize="3xs" className="shrink-0">
            {t('workflow.engineV2')}
          </Badge>
        ) : null}
        <span className="ml-auto shrink-0 text-2xs text-muted-foreground">
          {view.stats.phases > 0
            ? t('workflow.runPanel.phasesDetail', { count: view.stats.phases })
            : ''}
          {view.stats.phases > 0 && activeAgents > 0 ? ' · ' : ''}
          {activeAgents > 0
            ? t('workflow.runPanel.activeDetail', { count: activeAgents })
            : ''}
        </span>
        {cancellable ? (
          <Button
            size="sm"
            variant="outline"
            fontSize="xs" className="shrink-0"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(runId)}
            data-ai-component="workflow.run.cancel"
          >
            <Square className="mr-1 size-3" />
            {t('workflow.cancelRun')}
          </Button>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={onClose}
          aria-label={t('workflow.runPanel.close')}
          data-ai-component="workflow.run.close"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* 人工确认卡（suspended） */}
      {waiting ? (
        <div className="space-y-2 rounded-md border border-accent-yellow/40 bg-accent-yellow/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-accent-yellow">
            <UserCheck className="size-3.5" />
            {waiting.title || t('workflow.waitingApproval')}
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed">{waiting.message}</p>
          <Input fontSize="xs" size="h-7"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('workflow.notePlaceholder')}
            
          />
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              fontSize="xs" 
              disabled={resume.isPending}
              onClick={() =>
                resume.mutate(
                  {
                    runId,
                    data: {
                      resumeData: { approved: false, note },
                      ...(waiting.nodeId ? { nodeId: waiting.nodeId } : {}),
                    },
                  },
                  { onSuccess: () => setNote('') },
                )
              }
            >
              {t('workflow.reject')}
            </Button>
            <Button
              size="sm"
              fontSize="xs" 
              disabled={resume.isPending}
              onClick={() =>
                resume.mutate(
                  {
                    runId,
                    data: {
                      resumeData: { approved: true, note },
                      ...(waiting.nodeId ? { nodeId: waiting.nodeId } : {}),
                    },
                  },
                  { onSuccess: () => setNote('') },
                )
              }
            >
              <CheckCircle2 className="mr-1 size-3" />
              {t('workflow.approve')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* v2 阶段时间线（站列 + 药丸） */}
      {isV2Run ? <WorkflowRunTimeline stations={view.stations} /> : null}

      {/* 失败信息 */}
      {output?.error ? (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {output.error}
        </p>
      ) : null}

      {/* 文档回流产物行 */}
      {artifacts.length > 0 ? (
        <div className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t('workflow.runPanel.outputTitle')}
          </h3>
          {artifacts.map((artifact) => (
            <div
              key={artifact.key}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2"
              data-ai-entity={`document:${artifact.documentId}`}
            >
              <FileText className="size-4 shrink-0 text-accent-blue" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {artifact.title}
              </span>
              <span className="shrink-0 text-2xs text-muted-foreground">
                {t('workflow.runPanel.artifactDocument')}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* 事件流与输出明细折叠 */}
      <div className="flex flex-wrap items-center gap-2">
        {isV2Run && events.length > 0 ? (
          <details className="rounded-md border border-border px-2 py-1.5">
            <summary className="cursor-pointer text-2xs text-muted-foreground">
              {t('workflow.runEvents')} ({events.length})
            </summary>
            <ol className="mt-1 space-y-0.5">
              {events.map((e) => (
                <li key={e.id} className="text-3xs text-muted-foreground">
                  <span className="mr-1 font-mono">#{e.seq}</span>
                  {e.type}
                </li>
              ))}
            </ol>
          </details>
        ) : null}
        {run.output && !output?.error ? (
          <details className="rounded-md border border-border px-2 py-1.5">
            <summary className="cursor-pointer text-2xs text-muted-foreground">
              {t('workflow.runPanel.outputDetail')}
            </summary>
            <pre className="mt-1 max-h-48 max-w-140 overflow-auto text-2xs leading-relaxed">
              {JSON.stringify(stepsOutput ?? run.output, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>

      {/* 四格统计（收据线分隔） */}
      <StatsRow view={view} />
    </div>
  );
}
