/**
 * Workflow 详情页（CAP-A-12）——SubPageToolbar 标准头 + 画布主区占满 + 右侧栏。
 * 非编辑：右栏 = 运行历史 + run 详情（suspended 确认卡批准/拒绝即 resume）。
 * 编辑：右栏 = 选中步骤属性面板，主区左侧浮出节点库（分类待选组件）。
 * 进度失效经 socket 推送 + suspended/running 时 5s 轮询兜底双通道。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  PauseCircle,
  Pencil,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { RightSidebar } from '@/components/ui/right-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useResumeWorkflow,
  useUpdateWorkflow,
  useWorkflow,
  useWorkflowActions,
  useWorkflowEvents,
  useWorkflowRun,
  useWorkflowRuns,
} from '../hooks/use-workflows';
import { WorkflowCanvas, type CanvasStep } from '../components/workflow-canvas';
import {
  WorkflowStepEditor,
  type EditableStep,
} from '../components/workflow-step-editor';
import { WorkflowNodePalette } from '../components/workflow-node-palette';
import type { WorkflowRun } from '../api/workflow-api';

const RUN_STATUS_META: Record<string, { icon: typeof Clock; tone: string; labelKey: string }> = {
  running: { icon: CircleDashed, tone: 'text-accent-blue', labelKey: 'workflow.status.running' },
  succeeded: { icon: CheckCircle2, tone: 'text-accent-green', labelKey: 'workflow.status.succeeded' },
  failed: { icon: XCircle, tone: 'text-accent-red', labelKey: 'workflow.status.failed' },
  suspended: { icon: PauseCircle, tone: 'text-accent-yellow', labelKey: 'workflow.status.suspended' },
  cancelled: { icon: XCircle, tone: 'text-muted-foreground', labelKey: 'workflow.status.cancelled' },
};

const RUNNABLE = ['running', 'suspended'] as const;

/** 按步骤类型生成节点描述行（prompt/url/message 等的摘要） */
function stepDesc(step: Record<string, unknown>): string {
  const clip = (value: unknown, max = 64) => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };
  switch (step.type) {
    case 'llm':
      return clip(step.prompt);
    case 'http':
      return clip(`${String(step.method ?? 'GET')} ${String(step.url ?? '')}`);
    case 'human-confirm':
      return clip(step.message);
    case 'condition':
      return clip(`${String(step.left ?? '')} ${String(step.op ?? '')} ${String(step.right ?? '')}`);
    case 'action':
      return String(step.action ?? '');
    default:
      return '';
  }
}

function toCanvasSteps(raw: Array<Record<string, unknown>>): CanvasStep[] {
  return raw.map((s) => ({
    id: String(s.id ?? ''),
    type: String(s.type ?? ''),
    title: s.title !== undefined ? String(s.title) : undefined,
    desc: stepDesc(s),
  }));
}

export function WorkflowDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: workflow, isLoading } = useWorkflow(id);
  const { data: runsPage, isLoading: runsLoading } = useWorkflowRuns({});
  useWorkflowEvents();

  const urlRunId = searchParams.get('runId');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const activeRunId = selectedRunId ?? urlRunId;
  const [asideHidden, setAsideHidden] = useState(false);

  // ── 编辑模式：definition 步骤副本 + 选中步骤属性面板 + 左侧节点库 ──
  const updateMutation = useUpdateWorkflow(id);
  const { data: actions = [] } = useWorkflowActions();
  const [editing, setEditing] = useState(false);
  const [editSteps, setEditSteps] = useState<EditableStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const rawSteps = useMemo(() => {
    const defSteps =
      (workflow?.definition as { steps?: Array<Record<string, unknown>> } | undefined)?.steps ?? [];
    return defSteps;
  }, [workflow?.definition]);

  const canvasSteps = useMemo(
    () =>
      editing
        ? editSteps.map((s) => ({
            id: String(s.id ?? ''),
            type: String(s.type ?? ''),
            title: s.title !== undefined ? String(s.title) : undefined,
            desc: stepDesc(s),
          }))
        : toCanvasSteps(rawSteps),
    [editing, editSteps, rawSteps],
  );

  const startEditing = () => {
    setEditSteps(rawSteps.map((s) => ({ ...s })));
    setSelectedStepId(null);
    setEditing(true);
  };

  const selectedStep =
    editing && selectedStepId
      ? (editSteps.find((s) => s.id === selectedStepId) ?? null)
      : null;
  const selectedIndex = selectedStep
    ? editSteps.findIndex((s) => s.id === selectedStepId)
    : -1;

  const patchStep = (index: number, next: EditableStep) => {
    setEditSteps((prev) => prev.map((s, i) => (i === index ? next : s)));
  };

  const insertAfter = (index: number, step: EditableStep) => {
    const base = index >= 0 ? index : editSteps.length - 1;
    let n = editSteps.length + 1;
    const exists = (sid: string) => editSteps.some((s) => s.id === sid);
    let candidate = `step-${n}`;
    while (exists(candidate)) candidate = `step-${++n}`;
    const next: EditableStep = { id: candidate, ...step };
    setEditSteps((prev) => [...prev.slice(0, base + 1), next, ...prev.slice(base + 1)]);
    setSelectedStepId(candidate);
  };

  const removeStep = (index: number) => {
    setEditSteps((prev) => prev.filter((_, i) => i !== index));
    setSelectedStepId(null);
  };

  const moveStep = (index: number, delta: -1 | 1) => {
    setEditSteps((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveEditing = () => {
    const raw = (workflow?.definition ?? {}) as Record<string, unknown>;
    updateMutation.mutate(
      { definition: { ...raw, version: 1, steps: editSteps } },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <PageShell className="overflow-hidden">
      <SubPageToolbar
        aiId="workflow.detail"
        onBack={() => navigate('/app/workflows')}
        breadcrumbs={[
          { label: t('workflow.title'), to: '/app/workflows' },
          { label: workflow?.name ?? '…' },
        ]}
        actions={
          <>
            {workflow ? (
              <Badge variant="secondary" className="shrink-0">
                v{workflow.version}
              </Badge>
            ) : null}
            {editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditing(false)}
                >
                  {t('workflow.editor.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={updateMutation.isPending || editSteps.length === 0}
                  onClick={saveEditing}
                  data-ai="workflow.saveDefinition"
                >
                  {t('workflow.editor.save')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                disabled={!workflow}
                onClick={startEditing}
                data-ai="workflow.editToggle"
              >
                <Pencil className="size-3" />
                {t('workflow.editor.edit')}
              </Button>
            )}
          </>
        }
        sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
      />

      {isLoading || !workflow ? (
        <div className="min-h-0 flex-1 p-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-0">
          {/* 主区：描述行 + 画布（编辑模式左侧浮出节点库） */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 pb-3">
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {workflow.description || t('workflow.noDescription')}
            </p>
            <div className="flex min-h-0 flex-1 items-stretch gap-2">
              {editing ? (
                <WorkflowNodePalette
                  actions={actions}
                  onAdd={(type, actionId) =>
                    insertAfter(
                      selectedIndex,
                      actionId
                        ? { type: 'action', action: actionId }
                        : { type },
                    )
                  }
                  className="w-56 shrink-0 rounded-lg border border-border bg-card"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <WorkflowCanvas
                  steps={canvasSteps}
                  selectedId={selectedStepId}
                  onStepClick={editing ? setSelectedStepId : undefined}
                />
              </div>
            </div>
          </div>

          {/* 右侧栏：非编辑=运行历史；编辑=选中步骤属性面板 */}
          <RightSidebar hidden={asideHidden} className="overflow-hidden">
            {editing ? (
              <div className="flex h-full min-h-0 flex-col p-3">
                {selectedStep && selectedIndex >= 0 ? (
                  <WorkflowStepEditor
                    step={selectedStep}
                    actions={actions}
                    isFirst={selectedIndex === 0}
                    isLast={selectedIndex === editSteps.length - 1}
                    onChange={(next) => patchStep(selectedIndex, next)}
                    onDelete={() => removeStep(selectedIndex)}
                    onInsertAfter={() => insertAfter(selectedIndex, { type: 'llm', prompt: '' })}
                    onMoveUp={() => moveStep(selectedIndex, -1)}
                    onMoveDown={() => moveStep(selectedIndex, 1)}
                  />
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t('workflow.editor.pickHint')}
                  </p>
                )}
              </div>
            ) : (
              <RunsPanel
                runsPage={runsPage}
                runsLoading={runsLoading}
                activeRunId={activeRunId}
                onSelect={(runId) => {
                  setSelectedRunId(runId);
                  setSearchParams({ runId }, { replace: true });
                }}
              />
            )}
          </RightSidebar>
        </div>
      )}
    </PageShell>
  );
}

function RunsPanel({
  runsPage,
  runsLoading,
  activeRunId,
  onSelect,
}: {
  runsPage: { data: WorkflowRun[]; meta: { total: number } } | undefined;
  runsLoading: boolean;
  activeRunId: string | null;
  onSelect: (runId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3" data-ai="workflow.runs">
      <h2 className="text-xs font-medium text-muted-foreground">{t('workflow.runs')}</h2>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {runsLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : !runsPage || runsPage.data.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t('workflow.noRuns')}
          </p>
        ) : (
          runsPage.data.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              active={run.id === activeRunId}
              onClick={() => onSelect(run.id)}
            />
          ))
        )}
      </div>
      {activeRunId ? <RunDetailPanel runId={activeRunId} /> : null}
    </div>
  );
}

function RunRow({
  run,
  active,
  onClick,
}: {
  run: WorkflowRun;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const meta = RUN_STATUS_META[run.status] ?? RUN_STATUS_META.running;
  const Icon = meta.icon;
  const runnable = (RUNNABLE as readonly string[]).includes(run.status);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/40',
        active ? 'border-primary/50 bg-muted/40' : 'border-border',
      )}
    >
      <Icon className={cn('size-4 shrink-0', meta.tone, run.status === 'running' && 'animate-spin')} />
      <span className="text-xs font-medium">{t(meta.labelKey)}</span>
      <span className="ml-auto flex items-center gap-2 text-11 text-muted-foreground">
        <Clock className="size-3" />
        {new Date(run.createdAt).toLocaleString()}
      </span>
      {runnable ? (
        <Play className="size-3 shrink-0 text-content-text-muted" aria-hidden />
      ) : null}
    </button>
  );
}

function RunDetailPanel({ runId }: { runId: string }) {
  const { t } = useTranslation();
  const { data: run, isLoading } = useWorkflowRun(runId);

  const resume = useResumeWorkflow();
  const [note, setNote] = useState('');

  if (isLoading || !run) return <Skeleton className="h-32 rounded-lg" />;

  const waiting = run.waitingApproval;
  const output = run.output as { error?: string } | null | undefined;

  return (
    <Card className="shrink-0">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <StatusPill tone="info">
            <code className="text-11">{run.id.slice(0, 12)}…</code>
          </StatusPill>
          <span className="text-11 text-muted-foreground">
            {t('workflow.triggerType')}: {run.triggerType}
          </span>
        </div>

        {waiting ? (
          <div className="space-y-2 rounded-md border border-accent-yellow/40 bg-accent-yellow/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-accent-yellow">
              <ShieldCheck className="size-3.5" />
              {waiting.title || t('workflow.waitingApproval')}
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{waiting.message}</p>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('workflow.notePlaceholder')}
              className="h-7 text-xs"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={resume.isPending}
                onClick={() =>
                  resume.mutate(
                    { runId, data: { resumeData: { approved: false, note } } },
                    { onSuccess: () => setNote('') },
                  )
                }
              >
                {t('workflow.reject')}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={resume.isPending}
                onClick={() =>
                  resume.mutate(
                    { runId, data: { resumeData: { approved: true, note } } },
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

        {output?.error ? (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{output.error}</p>
        ) : null}

        {run.output && !output?.error ? (
          <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-11 leading-relaxed">
            {JSON.stringify(run.output, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
