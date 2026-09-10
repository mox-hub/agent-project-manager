/**
 * Workflow 详情页（CAP-A-11 基座）——定义步骤时间线 + run 历史 + run 详情。
 * suspended 的 run 显示人工确认卡（批准/拒绝 + 备注），提交即 resume。
 * 轮询兜底（suspended/running 时 5s）+ socket 推送失效双通道。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock,
  GitBranch,
  PauseCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
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
import { WorkflowCanvas } from '../components/workflow-canvas';
import {
  WorkflowStepEditor,
  type EditableStep,
} from '../components/workflow-step-editor';
import type { WorkflowRun } from '../api/workflow-api';

const RUN_STATUS_META: Record<string, { icon: typeof Clock; tone: string; labelKey: string }> = {
  running: { icon: CircleDashed, tone: 'text-accent-blue', labelKey: 'workflow.status.running' },
  succeeded: { icon: CheckCircle2, tone: 'text-accent-green', labelKey: 'workflow.status.succeeded' },
  failed: { icon: XCircle, tone: 'text-accent-red', labelKey: 'workflow.status.failed' },
  suspended: { icon: PauseCircle, tone: 'text-accent-yellow', labelKey: 'workflow.status.suspended' },
  cancelled: { icon: XCircle, tone: 'text-muted-foreground', labelKey: 'workflow.status.cancelled' },
};

export function WorkflowDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: workflow, isLoading } = useWorkflow(id);
  const { data: runsPage, isLoading: runsLoading } = useWorkflowRuns({});
  useWorkflowEvents();

  const urlRunId = searchParams.get('runId');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const activeRunId = selectedRunId ?? urlRunId;

  // ── 编辑模式（CAP-A-12 切片②）：definition 步骤副本 + 选中步骤属性面板 ──
  const updateMutation = useUpdateWorkflow(id);
  const { data: actions = [] } = useWorkflowActions();
  const [editing, setEditing] = useState(false);
  const [editSteps, setEditSteps] = useState<EditableStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const { data: fullWorkflow } = useWorkflow(editing ? id : '');

  const steps =
    (workflow?.stepsSummary as Array<{ id: string; type: string; title?: string }> | undefined) ??
    [];

  const startEditing = () => {
    const defSteps =
      ((fullWorkflow?.definition as { steps?: EditableStep[] } | undefined)?.steps ?? []) as EditableStep[];
    setEditSteps(defSteps.map((s) => ({ ...s })));
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

  const insertAfter = (index: number) => {
    let n = editSteps.length + 1;
    const exists = (id: string) => editSteps.some((s) => s.id === id);
    let candidate = `step-${n}`;
    while (exists(candidate)) candidate = `step-${++n}`;
    const next: EditableStep = { id: candidate, type: 'llm', prompt: '' };
    setEditSteps((prev) => [...prev.slice(0, index + 1), next, ...prev.slice(index + 1)]);
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
    const raw = (fullWorkflow?.definition ?? {}) as Record<string, unknown>;
    updateMutation.mutate(
      { definition: { ...raw, version: 1, steps: editSteps } },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <PageShell>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/app/workflows" aria-label={t('common.back')}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch className="size-4 shrink-0 text-muted-foreground" />
          <h1 className="truncate text-sm font-semibold">
            {isLoading ? '…' : workflow?.name}
          </h1>
          {workflow ? (
            <Badge variant="secondary" className="shrink-0">
              v{workflow.version}
            </Badge>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 shrink-0 text-xs"
            disabled={!workflow}
            onClick={() => (editing ? setEditing(false) : startEditing())}
            data-ai="workflow.editToggle"
          >
            {editing ? t('workflow.editor.cancel') : t('workflow.editor.edit')}
          </Button>
        </div>
      </div>

      {isLoading || !workflow ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : editing ? (
        <div className="flex items-stretch gap-3">
          <div className="min-w-0 flex-1">
            <WorkflowCanvas
              steps={editSteps as Array<{ id: string; type: string; title?: string }>}
              selectedId={selectedStepId}
              onStepClick={setSelectedStepId}
            />
          </div>
          <div className="w-72 shrink-0 rounded-lg border border-border bg-card p-3">
            {selectedStep && selectedIndex >= 0 ? (
              <WorkflowStepEditor
                step={selectedStep}
                actions={actions}
                isFirst={selectedIndex === 0}
                isLast={selectedIndex === editSteps.length - 1}
                onChange={(next) => patchStep(selectedIndex, next)}
                onDelete={() => removeStep(selectedIndex)}
                onInsertAfter={() => insertAfter(selectedIndex)}
                onMoveUp={() => moveStep(selectedIndex, -1)}
                onMoveDown={() => moveStep(selectedIndex, 1)}
              />
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('workflow.editor.pickHint')}
              </p>
            )}
            <div className="mt-3 flex justify-end gap-1.5 border-t border-border pt-3">
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
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {workflow.description || t('workflow.noDescription')}
            </p>
            {steps.length > 0 ? (
              <WorkflowCanvas steps={steps} />
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* run 历史 */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground">{t('workflow.runs')}</h2>
        {runsLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : !runsPage || runsPage.data.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t('workflow.noRuns')}
          </p>
        ) : (
          <div className="space-y-1.5">
            {runsPage.data.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                active={run.id === activeRunId}
                onClick={() => {
                  setSelectedRunId(run.id);
                  setSearchParams({ runId: run.id }, { replace: true });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {activeRunId ? <RunDetailPanel runId={activeRunId} /> : null}
    </PageShell>
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
    <Card>
      <CardContent className="space-y-3 p-4">
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
