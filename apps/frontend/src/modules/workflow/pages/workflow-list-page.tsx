/**
 * Workflow 列表页（CAP-A-11 基座）——定义卡片 + 触发对话框。
 * 「运行」支持可选 JSON 入参（demo 工作流只需 { "topic": "..." }）。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GitBranch, LayoutGrid, List, Play, Plus, Sparkles, Workflow as WorkflowIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { PageShell } from '@/components/ui/page-shell';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  useCreateWorkflow,
  useTriggerWorkflow,
  useWorkflowEvents,
  useWorkflows,
} from '../hooks/use-workflows';
import { useWorkflowDraft } from '@/modules/assistant/hooks/use-workflow-draft';
import type { WorkflowSummary } from '../api/workflow-api';

type WorkflowViewMode = 'grid' | 'list';

export function WorkflowListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: workflows, isLoading } = useWorkflows();
  useWorkflowEvents();

  const [triggerTarget, setTriggerTarget] = useState<WorkflowSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<WorkflowViewMode>('grid');

  const toolbar = useToolbarViews({
    key: 'workflow-list',
    defaults: [
      {
        id: 'all',
        name: t('common.all', '全部'),
        icon: 'list',
        builtIn: true,
        snapshot: { search: '', viewMode: 'grid' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{ search: string; viewMode: WorkflowViewMode }>;
      setSearch(snap.search ?? '');
      setViewMode(snap.viewMode ?? 'grid');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, viewMode });
  }, [updateActiveSnapshot, search, viewMode]);

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    if (!search.trim()) return workflows;
    const query = search.trim().toLowerCase();
    return workflows.filter(
      (wf) =>
        wf.name.toLowerCase().includes(query) ||
        wf.key.toLowerCase().includes(query) ||
        (wf.description && wf.description.toLowerCase().includes(query)),
    );
  }, [workflows, search]);

  return (
    <PageShell className="overflow-hidden" aiPage="workflow.workflow-list">
      <PageHeader
        aiId="workflow.workflow-list"
        title={t('workflow.title')}
        icon={WorkflowIcon}
        iconColor="text-accent-purple"
        metrics={[{ id: 'total', label: t('workflow.title'), value: filteredWorkflows.length }]}
        actions={
          <HeaderActionButton
            icon={Plus}
            label={t('workflow.createDialog.open')}
            onClick={() => setCreateOpen(true)}
            data-ai-component="workflow.workflow-list.new-button"
            data-ai-action="workflow.workflow-list.new-button.click"
            data-ai-role="submit"
          />
        }
      />

      <ToolbarRow
        aiId="workflow.workflow-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        isDirty={toolbar.isDirty}
        onSaveCurrentView={toolbar.saveCurrentToActive}
        viewStyle={{
          layout: 'centered',
          value: viewMode,
          onChange: (v) => setViewMode(v as WorkflowViewMode),
          options: [
            { value: 'grid', label: t('workflow.view.grid'), icon: LayoutGrid },
            { value: 'list', label: t('workflow.view.list'), icon: List },
          ],
        }}
        filterMenu={{
          badge: [Boolean(search.trim())].filter(Boolean).length,
          search: {
            value: search,
            onChange: setSearch,
            placeholder: t('workflow.filter.searchPlaceholder'),
          },
        }}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="flex w-full min-w-0 flex-1 flex-col overflow-y-auto px-6 py-4 sm:px-8 sm:py-5 lg:px-10">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">{t('workflow.empty')}</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredWorkflows.map((wf) => (
              <Card
                key={wf.id}
                className="cursor-pointer transition-colors hover:border-border/80 hover:bg-muted/30"
                onClick={() => navigate(`/app/workflows/${wf.id}`)}
              >
                <CardContent className="flex items-center justify-between gap-4 p-3.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
                      <GitBranch className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium hover:underline">
                          {wf.name}
                        </span>
                        <Badge variant="secondary" className="shrink-0 text-10">
                          v{wf.version}
                        </Badge>
                        <code className="font-mono text-11 text-muted-foreground/60">
                          {wf.key}
                        </code>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {wf.description || t('workflow.noDescription')}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTriggerTarget(wf);
                      }}
                    >
                      <Play className="size-3" />
                      {t('workflow.run')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredWorkflows.map((wf) => (
              <Card
                key={wf.id}
                className="transition-colors hover:border-border/80 hover:bg-muted/30"
              >
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left"
                      onClick={() => navigate(`/app/workflows/${wf.id}`)}
                    >
                      <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium hover:underline">
                        {wf.name}
                      </span>
                    </button>
                    <Badge variant="secondary" className="shrink-0">
                      v{wf.version}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => navigate(`/app/workflows/${wf.id}`)}
                  >
                    <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                      {wf.description || t('workflow.noDescription')}
                    </p>
                  </button>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <code className="truncate text-11 text-muted-foreground/60">{wf.key}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => setTriggerTarget(wf)}
                    >
                      <Play className="size-3" />
                      {t('workflow.run')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TriggerDialog target={triggerTarget} onClose={() => setTriggerTarget(null)} />
      <CreateWorkflowDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageShell>
  );
}

/** 新建工作流：基本信息 + AI 草拟流程（描述需求 → definition 草稿） */
function CreateWorkflowDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateWorkflow();
  const draft = useWorkflowDraft();

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSteps, setAiSteps] = useState<Array<Record<string, unknown>>>([]);

  const reset = () => {
    setKey('');
    setName('');
    setDescription('');
    setAiPrompt('');
    setAiSteps([]);
  };

  const handleDraft = () => {
    if (!aiPrompt.trim() || draft.isPending) return;
    draft.mutate(
      { description: aiPrompt.trim() },
      {
        onSuccess: (result) => {
          setName((prev) => prev || result.name);
          setDescription((prev) => prev || result.description);
          setAiSteps(result.steps);
          toast.success(t('workflow.createDialog.drafted'));
        },
      },
    );
  };

  const handleSave = () => {
    if (!key.trim() || !name.trim() || aiSteps.length === 0) {
      toast.error(t('workflow.createDialog.required'));
      return;
    }
    create.mutate(
      {
        key: key.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        definition: { version: 1, steps: aiSteps },
      },
      {
        onSuccess: (res) => {
          toast.success(t('workflow.createDialog.created'));
          onClose();
          reset();
          navigate(`/app/workflows/${res.id}`);
        },
        onError: (err) => toast.error((err as Error).message || t('workflow.createDialog.failed')),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('workflow.createDialog.title')}</DialogTitle>
          <DialogDescription>{t('workflow.createDialog.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5 rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-content-text">
              <Sparkles className="size-3.5 text-accent-purple" />
              {t('workflow.createDialog.aiLabel')}
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={2}
              placeholder={t('workflow.createDialog.aiPlaceholder')}
              className="w-full resize-y rounded-lg border border-border bg-content-bg px-3 py-2 text-xs text-content-text outline-none transition-colors placeholder:text-content-text-muted focus:border-accent-blue/60"
              data-ai="workflow.aiPrompt"
            />
            <div className="flex items-center justify-between">
              <span className="text-11 text-content-text-muted">
                {aiSteps.length > 0
                  ? t('workflow.createDialog.draftedSteps', { count: aiSteps.length })
                  : t('workflow.createDialog.aiHint')}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={draft.isPending || !aiPrompt.trim()}
                onClick={handleDraft}
                data-ai="workflow.aiDraft"
              >
                <Sparkles
                  className={cn(
                    'mr-1 size-3 text-accent-purple',
                    draft.isPending && 'animate-pulse',
                  )}
                />
                {draft.isPending ? t('workflow.createDialog.drafting') : t('workflow.createDialog.draft')}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('workflow.createDialog.keyLabel')}
            </label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="weekly-report"
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('workflow.createDialog.nameLabel')}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('workflow.createDialog.descLabel')}
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={create.isPending || aiSteps.length === 0 || !key.trim() || !name.trim()}
            onClick={handleSave}
            data-ai="workflow.createSave"
          >
            {t('workflow.createDialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TriggerDialog({
  target,
  onClose,
}: {
  target: WorkflowSummary | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [parametersText, setParametersText] = useState('{}');
  const trigger = useTriggerWorkflow(target?.id ?? '');

  const handleRun = () => {
    if (!target) return;
    let parameters: Record<string, unknown> = {};
    const trimmed = parametersText.trim();
    if (trimmed) {
      try {
        parameters = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        toast(t('workflow.invalidJson'));
        return;
      }
    }
    trigger.mutate(
      { parameters },
      {
        onSuccess: (res) => {
          toast(t('workflow.triggered'));
          onClose();
          navigate(`/app/workflows/${target.id}?runId=${res.workflowRunId}`);
        },
          onError: () => toast(t('workflow.triggerFailed')),
      },
    );
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('workflow.runDialogTitle', { name: target?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('workflow.runDialogHint')}</DialogDescription>
        </DialogHeader>
        <textarea
          value={parametersText}
          onChange={(e) => setParametersText(e.target.value)}
          rows={5}
          spellCheck={false}
          className="w-full rounded-md border border-border bg-transparent p-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder='{ "topic": "..." }'
        />
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleRun} disabled={trigger.isPending}>
            <Play className="mr-1 size-3" />
            {t('workflow.run')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
