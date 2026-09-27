/**
 * Workflow 详情页（CAP-A-12 / CAP-S-03 呈现层复刻）——SubPageToolbar 标准头
 * + 主区两态 + 右侧栏。主区：选中 run 时渲染运行面板（ZCode 工作流卡形态：
 * 种类词表头+阶段时间线+确认卡+产物+统计），未选中时为定义画布。
 * 编辑：主区左侧浮出节点库（v1）或 JSON 源码模式（v2 节点树文法）。
 * 进度失效经 socket 推送 + suspended/running 时 5s 轮询兜底双通道。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, CircleDashed, Clock, Pencil, Play, XCircle, CheckCircle2, PauseCircle } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { RightSidebar } from '@/components/ui/right-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useUpdateWorkflow,
  useWorkflow,
  useWorkflowActions,
  useWorkflowEvents,
  useWorkflowRuns,
} from '../hooks/use-workflows';
import { WorkflowCanvas, type CanvasStep } from '../components/workflow-canvas';
import {
  WorkflowStepEditor,
  type EditableStep,
} from '../components/workflow-step-editor';
import { WorkflowNodePalette } from '../components/workflow-node-palette';
import { WorkflowRunPanel } from '../components/workflow-run-panel';
import { WorkflowRunTimeline } from '../components/workflow-run-timeline';
import { WorkflowTriggerDialog } from '../components/workflow-trigger-dialog';
import {
  buildRunView,
  type V2NodeSummary,
} from '../components/run-view/build-run-view';
import type { WorkflowRun } from '../api/workflow-api';

const RUN_STATUS_META: Record<string, { icon: typeof Clock; tone: string; labelKey: string }> = {
  running: { icon: CircleDashed, tone: 'text-accent-yellow', labelKey: 'workflow.status.running' },
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
  // v2 节点树文法：画布（线性链）不适用，编辑走 JSON 源码模式（CAP-S-03 W3）
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  const isV2Doc =
    (workflow?.definition as { version?: number } | undefined)?.version === 2;

  const startEditing = () => {
    if (isV2Doc) {
      setJsonDraft(JSON.stringify(workflow?.definition, null, 2));
      setJsonError(null);
    }
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
    if (isV2Doc) {
      // v2：JSON 原样保存（version 不得被降级覆写）
      try {
        const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
        if (parsed.version !== 2) throw new Error('version');
        updateMutation.mutate(
          { definition: parsed },
          { onSuccess: () => setEditing(false) },
        );
      } catch {
        setJsonError(t('workflow.editor.jsonInvalid'));
      }
      return;
    }
    const raw = (workflow?.definition ?? {}) as Record<string, unknown>;
    updateMutation.mutate(
      { definition: { ...raw, version: 1, steps: editSteps } },
      { onSuccess: () => setEditing(false) },
    );
  };

  const closeRun = () => {
    setSelectedRunId(null);
    searchParams.delete('runId');
    setSearchParams(searchParams, { replace: true });
  };

  // v2 默认态：静态阶段预览（graphSummary 投影 + 空 journal → 全 pending 站）+ 触发入口
  const [triggerOpen, setTriggerOpen] = useState(false);
  const staticView = useMemo(
    () =>
      isV2Doc && workflow?.stepsSummary
        ? buildRunView(workflow.stepsSummary as unknown as V2NodeSummary[], [], {})
        : null,
    [isV2Doc, workflow?.stepsSummary],
  );
  const staticStations = staticView?.stations ?? [];
  const staticAgentCount = new Set(
    staticStations.flatMap((s) => s.pills).filter((p) => p.type === 'agent').map((p) => p.nodeId),
  ).size;

  return (
    <PageShell className="overflow-hidden" aiPage="workflow.detail">
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
              <Badge
                variant="secondary"
                className="shrink-0 text-3xs"
                title={t('workflow.grammarVersionBadge')}
              >
                v{workflow.grammarVersion ?? 1}
              </Badge>
            ) : null}
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs text-muted-foreground"
                  onClick={() => setEditing(false)}
                >
                  {t('workflow.editor.cancel')}
                </Button>
                <HeaderActionButton
                  icon={Check}
                  label={t('workflow.editor.save')}
                  variant="primary"
                  disabled={
                    updateMutation.isPending ||
                    (!isV2Doc && editSteps.length === 0)
                  }
                  onClick={saveEditing}
                  data-ai-component="workflow.detail.save-definition"
                  data-ai-action="workflow.detail.save-definition.click"
                />
              </>
            ) : (
              <>
                <HeaderActionButton
                  icon={Play}
                  label={t('workflow.run')}
                  disabled={!workflow}
                  onClick={() => setTriggerOpen(true)}
                  data-ai-component="workflow.detail.run-toggle"
                  data-ai-action="workflow.detail.run-toggle.click"
                />
                <HeaderActionButton
                  icon={Pencil}
                  label={t('workflow.editor.edit')}
                  disabled={!workflow}
                  onClick={startEditing}
                  data-ai-component="workflow.detail.edit-toggle"
                  data-ai-action="workflow.detail.edit-toggle.click"
                />
              </>
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
          {/* 主区分态：选中 run → 运行面板；v2 定义 → 静态阶段预览；v1 → 定义画布（编辑模式浮出节点库/JSON） */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 pb-3">
            {!editing && activeRunId ? (
              <WorkflowRunPanel runId={activeRunId} onClose={closeRun} />
            ) : !editing && isV2Doc ? (
              <Card className="min-h-0 flex-1 overflow-y-auto">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('workflow.runPanel.previewTitle')}
                    </span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-3xs"
                      title={t('workflow.grammarVersionBadge')}
                    >
                      v2
                    </Badge>
                    <span className="ml-auto text-2xs text-muted-foreground">
                      {staticView
                        ? t('workflow.runPanel.phasesDetail', { count: staticView.stats.phases })
                        : ''}
                      {staticView && staticAgentCount > 0
                        ? ` · ${t('workflow.runPanel.agentsDetail', { count: staticAgentCount })}`
                        : ''}
                    </span>
                  </div>
                  <WorkflowRunTimeline stations={staticStations} />
                  <p className="text-2xs leading-relaxed text-muted-foreground">
                    {t('workflow.runPanel.previewHint')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {workflow.description || t('workflow.noDescription')}
                </p>
                <div className="flex min-h-0 flex-1 items-stretch gap-2">
                  {editing && !isV2Doc ? (
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
                  {editing && isV2Doc ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                      <p className="text-2xs text-muted-foreground">
                        {t('workflow.editor.jsonModeHint')}
                      </p>
                      <textarea
                        value={jsonDraft}
                        onChange={(e) => {
                          setJsonDraft(e.target.value);
                          setJsonError(null);
                        }}
                        spellCheck={false}
                        className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/50"
                        data-ai-component="workflow.detail.v2-json-editor"
                      />
                      {jsonError ? (
                        <p className="text-xs text-destructive">{jsonError}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <WorkflowCanvas
                        steps={canvasSteps}
                        selectedId={selectedStepId}
                        onStepClick={editing && !isV2Doc ? setSelectedStepId : undefined}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
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
                  if (runId) {
                    setSearchParams({ runId }, { replace: true });
                  } else {
                    searchParams.delete('runId');
                    setSearchParams(searchParams, { replace: true });
                  }
                }}
              />
            )}
          </RightSidebar>
        </div>
      )}
      <WorkflowTriggerDialog
        open={triggerOpen}
        target={
          workflow
            ? {
                id: workflow.id,
                key: workflow.key,
                name: workflow.name,
                description: workflow.description ?? null,
                version: workflow.version,
                grammarVersion: workflow.grammarVersion,
              }
            : null
        }
        onClose={() => setTriggerOpen(false)}
      />
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
  /** 点击 run：未选中则选中，已选中则取消（回定义视图） */
  onSelect: (runId: string | null) => void;
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
              onClick={() => onSelect(run.id === activeRunId ? null : run.id)}
            />
          ))
        )}
      </div>
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
      <span className="ml-auto flex items-center gap-2 text-2xs text-muted-foreground">
        <Clock className="size-3" />
        {new Date(run.createdAt).toLocaleString()}
      </span>
      {runnable ? (
        <Play className="size-3 shrink-0 text-content-text-muted" aria-hidden />
      ) : null}
    </button>
  );
}
