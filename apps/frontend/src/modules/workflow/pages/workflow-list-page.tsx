/**
 * Workflow 列表页（CAP-A-11 基座）——定义卡片 + 触发对话框。
 * 「运行」支持可选 JSON 入参（demo 工作流只需 { "topic": "..." }）。
 */
import { FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GitBranch, LayoutGrid, List, Play, Plus, SearchX, Sparkles, Workflow as WorkflowIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { PageShell } from '@/components/ui/page-shell';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconStack } from '@/components/ui/icon-stack';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  useCreateWorkflow,
  useTriggerWorkflow,
  useWorkflowEvents,
  useWorkflows,
} from '../hooks/use-workflows';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkflowDraft } from '../hooks/use-workflow-draft';
import { WorkflowTriggerDialog } from '../components/workflow-trigger-dialog';
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
              <Skeleton key={i}  />
            ))}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          search.trim() ? (
            <EmptyState
              icon={SearchX}
              title={t('workflow.empty')}
              description={t('workflow.emptyHint')}
              action={
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  {t('common.filterClear', '清除筛选')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="page"
              visual={
                <IconStack aria-hidden="true" >
                  <WorkflowIcon className="size-4 text-accent-purple" />
                </IconStack>
              }
              title={t('workflow.empty')}
              description={t('workflow.emptyHint')}
            />
          )
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredWorkflows.map((wf) => (
              <Card
                key={wf.id}
                className="cursor-pointer transition-colors"
                onClick={() => navigate(`/app/workflows/${wf.id}`)}
              >
                <CardContent className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
                      <GitBranch className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium hover:underline">
                          {wf.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="shrink-0"
                          title={t('workflow.grammarVersionBadge')}
                        >
                          <span className="text-3xs">v{wf.grammarVersion ?? 1}</span>
                        </Badge>
                        <code className="font-mono text-2xs text-muted-foreground/60">
                          {wf.key}
                        </code>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {wf.description || t('workflow.noDescription')}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button fontSize="xs"
                      size="sm"
                      variant="outline"
                      
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
                className="transition-colors"
              >
                <CardContent className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Button variant="ghost"
                      type="button"
                      className="flex items-center"
                      onClick={() => navigate(`/app/workflows/${wf.id}`)}
                    >
                      <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium hover:underline">
                        {wf.name}
                      </span>
                    </Button>
                    <Badge
                      variant="secondary"
                      className="shrink-0"
                      title={t('workflow.grammarVersionBadge')}
                    >
                      v{wf.grammarVersion ?? 1}
                    </Badge>
                  </div>
                  <Button variant="ghost"
                    type="button"
                    
                    onClick={() => navigate(`/app/workflows/${wf.id}`)}
                  >
                    <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                      {wf.description || t('workflow.noDescription')}
                    </p>
                  </Button>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <code className="truncate text-2xs text-muted-foreground/60">{wf.key}</code>
                    <Button fontSize="xs"
                      size="sm"
                      variant="outline"
                      
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

      <WorkflowTriggerDialog
        target={triggerTarget}
        onClose={() => setTriggerTarget(null)}
      />
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
      <DialogContent maxWidth="lg" className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('workflow.createDialog.title')}</DialogTitle>
          <DialogDescription>{t('workflow.createDialog.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5 rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-3">
            <FieldLabel size="xs" variant="muted" className="flex items-center">
              <Sparkles className="size-3.5 text-accent-purple" />
              {t('workflow.createDialog.aiLabel')}
            </FieldLabel>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={2}
              placeholder={t('workflow.createDialog.aiPlaceholder')}
              className="resize-y outline-none transition-colors"
              data-ai="workflow.aiPrompt"
            />
            <div className="flex items-center justify-between">
              <span className="text-2xs text-content-text-muted">
                {aiSteps.length > 0
                  ? t('workflow.createDialog.draftedSteps', { count: aiSteps.length })
                  : t('workflow.createDialog.aiHint')}
              </span>
              <Button                 variant="outline"
                size="sm"
                
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
            <FieldLabel size="xs" variant="muted" >
              {t('workflow.createDialog.keyLabel')}
            </FieldLabel>
            <Input fontSize="xs" size="h-8" fontVariant="mono"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="weekly-report"
              
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel size="xs" variant="muted" >
              {t('workflow.createDialog.nameLabel')}
            </FieldLabel>
            <Input fontSize="xs" size="h-8"
              value={name}
              onChange={(e) => setName(e.target.value)}
              
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel size="xs" variant="muted" >
              {t('workflow.createDialog.descLabel')}
            </FieldLabel>
            <Input fontSize="xs" size="h-8"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              
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
