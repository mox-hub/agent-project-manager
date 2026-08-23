/**
 * TaskDetailPage - 任务详情页
 *
 * Linear 风格布局:
 * - Header: 面包屑 + prev/next 导航
 * - Main: 状态图标 + 标题(热编辑) + 短ID + 描述(热编辑) + 子任务卡片 + 手风琴(文档/评论)
 * - Right (320px): 顶部操作条(指派AI/删除) + Properties (全部可下拉) + Suggestions
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CheckCircle, CheckCircle2, FileText, XCircle, Loader2,
  Trash2, Bot as BotIcon,
  ChevronUp, ChevronDown,
  AlertCircle, Flag, User as UserIcon, Tag, CalendarIcon, Circle,
  Diamond as DiamondIcon, MessageSquare, ListTodo, Plus,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { RightSidebar, SidebarButtonGroup, SidebarButton } from '@/components/ui/right-sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CapsuleSelect, DateCapsuleField, AutoSizeTextarea,
  PropertyRow, PropsCard, SuggestionsCard, MemberAvatar,
} from '@/components/ui/property-panel';
import {
  useTaskDetail, useTaskActivities, useUpdateTask, useDeleteTask,
  useProjectMilestones, useSubTasks, useCreateSubTask,
} from '../hooks/use-project-tasks';
import { taskApi } from '../api/task-api';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useProjectMembers } from '@/modules/team-member/hooks';
import { MentionTextarea } from '@/modules/team-member/components/mention-textarea';
import { useTags } from '@/modules/core-config/hooks/use-metadata';
import { type TaskPriority, type UpdateTaskRequest } from '../api/task-api';
import { cn } from '@/lib/utils';
import { useTabs } from '@/shared/tabs/tabs-context';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import { useEntityNavigation } from '@/shared/hooks/use-entity-navigation';
import { AiAssignDialog } from '../components/ai-assign-dialog';
import { ExecutionRunPanel } from '../components/execution-run-panel';
import { CompletionReview } from '../components/completion-review';
import { useAcceptancesByTask } from '@/modules/acceptance/hooks/use-acceptance';
import {
  useTaskDocumentLinks, LINK_TYPE_LABELS, LINK_TYPE_COLORS,
} from '@/modules/document/hooks/use-document-task-links';
import { TaskLinearPanel } from '@/modules/linear/components/task-linear-panel';
import { LinearConflictResolver } from '@/modules/linear/components/linear-conflict-resolver';
import { LinearExternalRefBadge, LinearSyncStatusBadge } from '@/modules/linear/components/linear-status-badge';
import { useLinearSyncEvents } from '@/modules/linear/hooks/use-linear-events';
import { GithubPanel } from '@/modules/github/components/github-panel';
import { useIntegrations } from '@/modules/integration/hooks/use-integrations';
import { useTranslation } from 'react-i18next';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', icon: ChevronDown, color: '#22c55e' },
  { value: 'medium', label: 'Medium', icon: ChevronDown, color: '#eab308' },
  { value: 'high', label: 'High', icon: ChevronUp, color: '#f97316' },
  { value: 'critical', label: 'Urgent', icon: AlertCircle, color: '#ef4444' },
];

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Todo', icon: Circle, color: '#8993a4' },
  { value: 'in_progress', label: 'In Progress', icon: Loader2, color: '#3b82f6' },
  { value: 'in_review', label: 'In Review', icon: AlertCircle, color: '#8b5cf6' },
  { value: 'done', label: 'Done', icon: CheckCircle, color: '#10b981' },
  { value: 'canceled', label: 'Canceled', icon: XCircle, color: '#b0b8c4' },
];

export function TaskDetailPage() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { updateTabByPath } = useTabs();
  const { t } = useTranslation();

  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAiAssignDialog, setShowAiAssignDialog] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [asideHidden, setAsideHidden] = useState(false);

  const { data: task, isLoading: taskLoading } = useTaskDetail(taskId);
  useLinearSyncEvents(task?.projectId);
  const { data: activities } = useTaskActivities(taskId);
  const { data: acceptances = [] } = useAcceptancesByTask(task?.id);
  const { data: project } = useProjectDetail(task?.projectId);
  const { data: integrations } = useIntegrations({ provider: 'github' });
  const githubIntegration = (integrations?.data ?? []).find((i: { provider: string }) => i.provider === 'github');
  const { data: projectListResp } = useProjectList();
  const projectList = useMemo(() => projectListResp?.items ?? [], [projectListResp]);
  const { data: milestones = [] } = useProjectMilestones(task?.projectId);
  const { data: members = [] } = useProjectMembers(task?.projectId);
  const { data: tags = [] } = useTags(task?.projectId, 'task');

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // ── prev/next 导航 (项目内)
  const nav = useEntityNavigation(task?.projectId ?? null, taskId, 'task');

  // ── 同步 Tab 标题与状态图标
  useEffect(() => {
    if (!taskId || !task?.title) return;
    const statusIcon = STATUS_OPTIONS.find((s) => s.value === task.status)?.icon;
    updateTabByPath(`/app/tasks/${taskId}`, {
      title: task.title,
      titleKey: undefined,
      statusIcon,
    });
  }, [task?.title, task?.status, taskId, updateTabByPath]);

  // ── Hot-edit: 标题 + 描述独立 debounce 保存
  const persistTitle = useDebouncedCallback(async (value: string) => {
    if (!taskId) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === task?.title) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId, data: { title: trimmed } });
    } catch {
      setMutationError(t('taskDetail.titleSaveFailed'));
    }
  }, 1500);

  const persistDescription = useDebouncedCallback(async (value: string) => {
    if (!taskId) return;
    if ((value || '') === (task?.description || '')) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId, data: { description: value } });
    } catch {
      setMutationError(t('taskDetail.descSaveFailed'));
    }
  }, 1500);

  // ── 描述的本地受控草稿（@ 提及输入需要受控值；保存仍走防抖持久化）
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  // 仅在切换任务时重置，避免查询刷新打断输入（渲染期间调整，避免 effect 内同步 setState）
  const [prevTaskId, setPrevTaskId] = useState(task?.id);
  if (prevTaskId !== task?.id) {
    setPrevTaskId(task?.id);
    setDescriptionDraft(null);
  }

  // ── Loading / not-found guards
  if (!taskId) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('taskDetail.notExists')}
        </div>
      </PageShell>
    );
  }
  if (taskLoading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-4 animate-spin mr-2" />
          {t('common.loading')}
        </div>
      </PageShell>
    );
  }
  if (!task) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('taskDetail.notFound')}
        </div>
      </PageShell>
    );
  }

  // ── Status / priority icons for current task
  const statusOpt = STATUS_OPTIONS.find((s) => s.value === task.status) ?? STATUS_OPTIONS[0];
  const StatusIcon = statusOpt.icon;
  const priorityOpt = PRIORITY_OPTIONS.find((p) => p.value === task.priority) ?? PRIORITY_OPTIONS[1];
  const PriorityIcon = priorityOpt.icon;

  const shortId = task.shortId || task.id.slice(0, 8);
  const currentAssigneeId = task.assignee?.id ?? '';
  const currentProjectId = task.projectId ?? '';
  const currentMilestoneId = task.milestoneId ?? '';
  const currentLabelIds = (task.taskTags ?? []).map((t) => t.tag.id);
  const currentTag = task.taskTags?.[0]?.tag;
  const currentTagId = currentTag?.id ?? '';
  const dueDate = task.dueDate ? task.dueDate.split('T')[0] : '';

  // ── Generic mutator (用于右侧栏属性直接更新)
  // 包含部分 UpdateTaskRequest 未涵盖的字段 (projectId), 这些字段依赖后端 PATCH 端点接受
  const updateField = async (patch: Partial<UpdateTaskRequest> & { projectId?: string | null }) => {
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId, data: patch });
    } catch {
      setMutationError(t('taskDetail.updateFailed'));
    }
  };

  // ── Delete
  const handleDelete = async () => {
    setMutationError(null);
    try {
      await deleteTask.mutateAsync(taskId);
      setShowDeleteDialog(false);
      navigate('/app/tasks');
    } catch {
      setMutationError(t('taskDetail.deleteFailed'));
    }
  };

  return (
    <PageShell aiPage="task.task-detail" className="overflow-hidden">
      {/* ─── SubPageToolbar：返回 + 面包屑 + 翻页器 + 侧栏开关 ─── */}
      <SubPageToolbar
        aiId="task.task-detail"
        backLabel={t('common.back')}
        breadcrumbs={[
          { label: 'Tasks', to: '/app/tasks' },
          ...(project ? [{ label: project.name, to: `/app/projects/${task.projectId}` }] : []),
          { label: shortId },
        ]}
        actions={<FavoriteToggle label={task?.title ?? ''} />}
        pager={
          task.projectId
            ? {
                hasPrev: nav.hasPrev && !nav.isLoading,
                hasNext: nav.hasNext && !nav.isLoading,
                onPrev: () => nav.prevId && navigate(`/app/tasks/${nav.prevId}`),
                onNext: () => nav.nextId && navigate(`/app/tasks/${nav.nextId}`),
                position: nav.currentPosition > 0 ? `${nav.currentPosition}/${nav.total}` : '—',
              }
            : undefined
        }
        sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
      />

      {/* ─── Body ─── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Main ── */}
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {mutationError && (
            <div className="mx-6 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutationError}
            </div>
          )}

          {/* Title */}
          <div className="px-6 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-start gap-3">
              <StatusIcon
                className="size-8 shrink-0 mt-1.5"
                style={{ color: statusOpt.color }}
              />
              <AutoSizeTextarea
                key={`title-${task.id}`}
                defaultValue={task.title}
                rows={1}
                placeholder={t('taskDetail.unnamedTitle')}
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-32 font-bold leading-tight placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="font-mono">{shortId}</span>
              <span className="opacity-50">•</span>
              <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
              {task.externalIdentifier ? (
                <>
                  <span className="opacity-50">•</span>
                  <LinearExternalRefBadge
                    identifier={task.externalIdentifier}
                    url={task.externalUrl}
                  />
                </>
              ) : null}
              {task.syncStatus ? (
                <LinearSyncStatusBadge status={task.syncStatus} />
              ) : null}
            </div>
          </div>

          {/* Description */}
          <div className="px-6 pt-4 pb-4 border-b shrink-0">
            <label className="text-10 font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Description
            </label>
            <MentionTextarea
              value={descriptionDraft ?? task.description ?? ''}
              onChange={(v) => {
                setDescriptionDraft(v);
                persistDescription(v);
              }}
              rows={3}
              placeholder={`${t('taskDetail.addDescription')}（输入 @ 可提及成员）`}
              className="[&_textarea]:w-full [&_textarea]:text-sm [&_textarea]:leading-relaxed [&_textarea]:border-0 [&_textarea]:px-0 [&_textarea]:focus-visible:border-0"
            />
          </div>

          {/* Sub-task section */}
          <SubTaskSection
            parentTaskId={task.id}
            projectId={task.projectId}
            defaultStatus={task.status}
            defaultPriority={task.priority}
            defaultAssigneeId={task.assignee?.id}
          />

          {/* Expandable sections: documents + discussion */}
          <div className="px-6 py-4 flex-1 min-h-0 flex flex-col gap-3">
            <DocumentSection taskId={taskId} />
            <DiscussionSection taskId={taskId} activities={activities} />
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <RightSidebar hidden={asideHidden} width={320}>
          {/* Top action bar — 按钮固定一行显示，圆形/胶囊形式 */}
          <SidebarButtonGroup className="px-1">
            {task.assigneeType !== 'ai_agent' && (
              <SidebarButton
                variant="capsule"
                icon={BotIcon}
                label={t('taskDetail.dispatchAi')}
                onClick={() => setShowAiAssignDialog(true)}
                data-ai-action="task.task-detail.assign-ai.click"
                className="text-accent-purple"
              />
            )}
            <SidebarButton
              icon={Trash2}
              label={t('common.delete')}
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            />
          </SidebarButtonGroup>

          {/* Properties */}
          <PropsCard
            title="Properties"
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow
              icon={<StatusIcon className="size-3.5" style={{ color: statusOpt.color }} />}
              label="Status"
            >
              <CapsuleSelect
                value={task.status}
                active
                options={STATUS_OPTIONS.map((s) => ({
                  value: s.value,
                  label: s.label,
                  icon: <s.icon className="size-3.5" style={{ color: s.color }} />,
                }))}
                onChange={(v) => updateField({ status: v || 'todo' })}
              />
            </PropertyRow>

            <PropertyRow
              icon={<PriorityIcon className="size-3.5" style={{ color: priorityOpt.color }} />}
              label="Priority"
            >
              <CapsuleSelect
                value={task.priority}
                active
                options={PRIORITY_OPTIONS.map((p) => ({
                  value: p.value,
                  label: p.label,
                  icon: <p.icon className="size-3.5" style={{ color: p.color }} />,
                }))}
                onChange={(v) => updateField({ priority: (v || 'medium') as TaskPriority })}
              />
            </PropertyRow>

            <PropertyRow
              icon={<UserIcon className="size-3.5" />}
              label="Assignee"
            >
              <CapsuleSelect
                value={currentAssigneeId}
                active={!!currentAssigneeId}
                placeholder="Unassigned"
                contentClassName="w-60"
                options={members.map((m) => ({
                  value: m.id,
                  label: m.displayName || m.handle,
                  icon: <MemberAvatar name={m.displayName || m.handle} avatarUrl={m.avatarUrl} />,
                }))}
                onChange={(v) => updateField({ assigneeId: v || undefined })}
              />
            </PropertyRow>

            <PropertyRow icon={<Flag className="size-3.5" />} label="Project">
              <CapsuleSelect
                value={currentProjectId}
                active={!!currentProjectId}
                placeholder="Inbox"
                options={projectList.map((p) => ({
                  value: p.id,
                  label: p.name,
                  icon: <Flag className="size-3.5" style={{ color: '#3b82f6' }} />,
                }))}
                onChange={(v) => updateField({ projectId: v || null })}
              />
            </PropertyRow>

            <PropertyRow icon={<DiamondIcon className="size-3.5 text-amber-500" />} label="Milestone">
              <CapsuleSelect
                value={currentMilestoneId}
                active={!!currentMilestoneId}
                placeholder="None"
                options={milestones.map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
                onChange={(v) => updateField({ milestoneId: v || null })}
              />
            </PropertyRow>

            <PropertyRow icon={<Tag className="size-3.5" />} label="Labels">
              <CapsuleSelect
                value={currentTagId}
                active={currentLabelIds.length > 0}
                placeholder={currentLabelIds.length > 0 ? `${currentTag?.name}${currentLabelIds.length > 1 ? ` +${currentLabelIds.length - 1}` : ''}` : 'None'}
                options={tags.map((tg) => ({
                  value: tg.id,
                  label: tg.name,
                  icon: tg.color ? <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: tg.color }} /> : undefined,
                }))}
                onChange={(v) => updateField({ tags: v ? [v] : [] })}
              />
            </PropertyRow>

            <PropertyRow icon={<CalendarIcon className="size-3.5" />} label="Due date">
              <DateCapsuleField
                value={dueDate}
                onChange={(v) => updateField({ dueDate: v || undefined })}
              />
            </PropertyRow>
          </PropsCard>

          <div>
            <SuggestionsCard
              collapsed={suggestionsCollapsed}
              onToggle={() => setSuggestionsCollapsed((v) => !v)}
            />
          </div>

          {task.projectId ? (
            <div className="space-y-2">
              <h3 className="px-1 text-10 font-semibold uppercase tracking-wider text-muted-foreground">
                External
              </h3>
              <TaskLinearPanel
                taskId={task.id}
                projectId={task.projectId}
                task={{
                  externalProvider: task.externalProvider,
                  externalIssueId: task.externalIssueId,
                  externalIdentifier: task.externalIdentifier,
                  externalUrl: task.externalUrl,
                  syncStatus: task.syncStatus,
                  lastExternalSyncAt: task.lastExternalSyncAt,
                }}
              />
              {task.syncStatus === 'conflict' ? (
                <LinearConflictResolver taskId={task.id} />
              ) : null}
            </div>
          ) : null}

          {/* ─── Execution Run Panel ─── */}
          <div className="space-y-2">
            <h3 className="px-1 text-10 font-semibold uppercase tracking-wider text-muted-foreground">
              Execution
            </h3>
            <ExecutionRunPanel taskId={task.id} />

            {/* Acceptance 接收/驳回 */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-accent-purple" />
                <h3 className="text-sm font-medium">{t('taskDetail.acceptanceContract')}</h3>
                {acceptances.length > 0 && (
                  <span className="text-xs text-muted-foreground">({acceptances.length})</span>
                )}
              </div>
              <CompletionReview taskId={task.id} acceptances={acceptances} />
            </div>
            {githubIntegration && (
              <div className="mt-3">
                <GithubPanel
                  integrationId={githubIntegration.id}
                  repoFullName={(project as unknown as { repositoryFullName?: string } | null)?.repositoryFullName}
                />
              </div>
            )}
          </div>
        </RightSidebar>
      </div>

      {/* ─── Delete dialog ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('taskDetail.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('taskDetail.deleteConfirm', { title: task.title })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTask.isPending}>
              {deleteTask.isPending ? <Loader2 className="size-3 animate-spin" /> : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AI Assign dialog ─── */}
      {task.projectId && (
        <AiAssignDialog
          open={showAiAssignDialog}
          onOpenChange={setShowAiAssignDialog}
          taskId={task.id}
          projectId={task.projectId}
          taskTitle={task.title}
        />
      )}
    </PageShell>
  );
}

// ===== Expandable Section =====

function ExpandableSection({
  title,
  icon: Icon,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {typeof count === 'number' && (
          <span className="text-10 text-muted-foreground/60 font-normal normal-case">({count})</span>
        )}
        <ChevronDown
          className={cn('ml-auto size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

// ===== SubTask Section =====

const SUB_STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: '#8993a4' },
  in_progress: { label: 'In Progress', icon: Loader2, color: '#3b82f6' },
  in_review: { label: 'In Review', icon: AlertCircle, color: '#8b5cf6' },
  done: { label: 'Done', icon: CheckCircle, color: '#10b981' },
  canceled: { label: 'Canceled', icon: XCircle, color: '#b0b8c4' },
};

function SubTaskSection({
  parentTaskId,
  projectId,
  defaultStatus,
  defaultPriority,
  defaultAssigneeId,
}: {
  parentTaskId: string;
  projectId: string | null | undefined;
  defaultStatus: string;
  defaultPriority: string;
  defaultAssigneeId?: string;
}) {
  const { t } = useTranslation();
  const { data: subTasks = [], isLoading } = useSubTasks(parentTaskId);
  const createSubTask = useCreateSubTask();
  const [subOpen, setSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!subTitle.trim()) return;
    setMutationError(null);
    try {
      await createSubTask.mutateAsync({
        title: subTitle.trim(),
        description: subDesc.trim() || undefined,
        parentTaskId,
        projectId: projectId ?? undefined,
        type: 'task',
        status: defaultStatus,
        priority: defaultPriority as TaskPriority,
        assigneeId: defaultAssigneeId,
      });
      setSubOpen(false);
      setSubTitle('');
      setSubDesc('');
    } catch {
      setMutationError(t('taskDetail.createSubtaskFailed'));
    }
  };

  return (
    <div className="border-t border-border/40">
      {/* Section header */}
      <div className="px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListTodo className="size-3.5" />
          {t('taskDetail.subtasks')}
          <span className="text-10 font-normal normal-case">({subTasks.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setSubOpen((v) => !v)}
          className="size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={subOpen ? t('taskDetail.collapse') : t('taskDetail.addSubtask')}
        >
          {subOpen ? <ChevronUp className="size-3.5" /> : <Plus className="size-3.5" />}
        </button>
      </div>

      {/* Sub-task list */}
      {isLoading ? (
        <div className="px-6 pb-2 text-xs text-muted-foreground">{t('common.loading')}</div>
      ) : subTasks.length > 0 ? (
        <div className="px-6 pb-1 flex flex-col gap-0.5">
          {subTasks.map((st) => {
            const statusCfg = SUB_STATUS_CONFIG[st.status] ?? SUB_STATUS_CONFIG['todo'];
            const StIcon = statusCfg.icon;
            return (
              <div
                key={st.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors group cursor-pointer"
              >
                <StIcon className="size-4 shrink-0" style={{ color: statusCfg.color }} />
                <span className="flex-1 text-sm truncate group-hover:text-primary transition-colors">{st.title}</span>
                <span className="text-10 font-mono text-muted-foreground/60 shrink-0">
                  {st.shortId || st.id.slice(0, 6)}
                </span>
                {st.priority && (
                  <span className={cn(
                    'size-1.5 rounded-full shrink-0',
                    st.priority === 'critical' ? 'bg-red-500' :
                    st.priority === 'high' ? 'bg-orange-500' :
                    st.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500',
                  )} />
                )}
                {st.dueDate && (
                  <span className="text-10 text-muted-foreground shrink-0">
                    {new Date(st.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Create sub-task form */}
      {subOpen && (
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
            <div className="p-3 flex flex-col gap-2">
              <AutoSizeTextarea
                autoFocus
                rows={1}
                placeholder={t('taskDetail.subtaskTitle')}
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                className="w-full text-sm font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
              />
              <AutoSizeTextarea
                rows={1}
                placeholder={t('taskDetail.addDescription')}
                value={subDesc}
                onChange={(e) => setSubDesc(e.target.value)}
                className="w-full text-xs font-normal placeholder:text-muted-foreground/50 focus-visible:ring-0"
              />
            </div>
            {mutationError && (
              <div className="mx-3 mb-2 text-xs text-destructive">{mutationError}</div>
            )}
            <div className="px-3 pb-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setSubOpen(false); setSubTitle(''); setSubDesc(''); }}
                className="h-7 px-3 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!subTitle.trim() || createSubTask.isPending}
                className="h-7 px-3 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createSubTask.isPending ? <Loader2 className="size-3 animate-spin" /> : t('taskDetail.saveSubtask')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Discussion Section =====

function CommentInput({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await taskApi.createActivity(taskId, { type: 'comment', content: text });
      setText('');
    } catch {
      setError(t('taskDetail.commentSendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex gap-2">
        <div className="flex-1">
          <AutoSizeTextarea
            rows={2}
            placeholder={t('taskDetail.addComment')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
        </div>
      </div>
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="h-7 px-3"
        >
          {submitting ? <Loader2 className="size-3 animate-spin" /> : t('taskDetail.send')}
        </Button>
      </div>
    </div>
  );
}

function DiscussionSection({ taskId, activities }: { taskId: string; activities: any }) {
  const { t } = useTranslation();
  const list = (activities ?? []).slice(0, 50);
  return (
    <ExpandableSection title={t('taskDetail.discussion')} icon={MessageSquare} count={list.length}>
      {list.length === 0 ? (
<div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          {t('task.detailDrawer.noDiscussion')}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a: any) => (
            <div key={a.id} className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {a.actorId?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{a.actorId || 'System'}</span>
                  <span className="text-11 text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {a.summary || a.content || a.type}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <CommentInput taskId={taskId} />
    </ExpandableSection>
  );
}

// ===== Document Section =====

function DocumentSection({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const { data: links = [], isLoading } = useTaskDocumentLinks(taskId);
  return (
    <ExpandableSection title={t('taskDetail.linkedDocs')} icon={FileText} count={links.length}>
      {isLoading ? (
        <div className="text-xs text-muted-foreground">{t('common.loading')}</div>
      ) : links.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          {t('taskDetail.noLinkedDocs')}
        </div>
      ) : (
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.id}>
              <Link
                to={`/app/documents/${link.documentId}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {link.document?.title || t('taskDetail.documentFallback', { id: link.documentId })}
                  </div>
                  {link.section && (
                    <div className="truncate text-11 text-muted-foreground">
                      {t('taskDetail.sectionLabel', { title: link.section.title })}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-10 font-medium',
                    LINK_TYPE_COLORS[link.linkType] || 'bg-muted text-muted-foreground',
                  )}
                >
                  {LINK_TYPE_LABELS[link.linkType] || link.linkType}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ExpandableSection>
  );
}
