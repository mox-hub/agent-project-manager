/**
 * TaskDetailPage - 任务详情页（Linear 风格统一改版）
 *
 * - Header: SubPageToolbar（面包屑 + prev/next 导航 + 收藏 + 侧栏开关）
 * - Main: 底框状态图标 + 标题(热编辑) + 元信息 + 描述(markdown 查看/热编辑)
 *         + 子任务行(底框图标/标签/优先级/负责人) + 关联文档 + Activity 动态(评论/表情)
 * - Right (320px): 操作条(指派AI/删除) + Properties + Suggestions + Linear/Github/执行/验收
 *
 * 动态与评论走 modules/activity（markdown + 表情回应），操作记录由服务端自动落库。
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/shared/confirm/confirm-provider';
import {
  AlertCircle as AlertCircleIcon,
  AlignLeft,
  Bot as BotIcon,
  CalendarIcon,
  CheckCircle2,
  Diamond as DiamondIcon,
  FileText,
  Flag,
  ListChecks,
  ListTree,
  Pencil,
  Plus,
  Tag,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import {
  AnchorQaGhostButton,
  AnchorQaThread,
} from '@/modules/assistant/components/anchor-qa-thread';
import type { AnchorQaAction } from '@/modules/assistant/hooks/use-anchor-qa';
import { Spinner } from '@/components/ui/spinner';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { SubscribeButton } from '@/shared/subscription/subscribe-button';
import { MarkdownView } from '@/shared/components/markdown-view';
import { RightSidebar, SidebarButtonGroup, SidebarButton } from '@/components/ui/right-sidebar';
import { SidebarPanel } from '@/components/ui/sidebar-panel';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CapsuleSelect, DateCapsuleField, AutoSizeTextarea,
  PropertyRow, PropsCard, SuggestionsCard, MemberAvatar,
} from '@/components/ui/property-panel';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { RoutePreviewTrigger } from '@/shared/route-preview/route-preview-trigger';
import { MarkdownEditor } from '@/shared/components/markdown-editor';
import {
  TONE_TEXT_CLASS,
  PRIORITY_VISUALS,
  TASK_STATUS_VISUALS,
} from '@/shared/status/status-visuals';
import {
  useTaskDetail, useUpdateTask, useDeleteTask,
  useProjectMilestones, useSubTasks, useCreateSubTask,
} from '../hooks/use-project-tasks';
import { useIssueTypes } from '../hooks/use-issue-types';
import { CustomFieldsSection, formatCustomFieldValue } from '../components/custom-field-input';
import { useAssigneeSync } from '../hooks/use-assignee-sync';
import { type TaskPriority, type UpdateTaskRequest } from '../api/issue-api';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useMembers } from '@/modules/team-member/hooks';
import { MentionTextarea } from '@/modules/team-member/components/mention-textarea';
import { useTags } from '@/modules/core-config/hooks/use-metadata';
import { cn } from '@/lib/utils';
import { useTabs } from '@/shared/tabs/tabs-context';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import { useEntityNavigation } from '@/shared/hooks/use-entity-navigation';
import { AiAssignDialog } from '../components/ai-assign-dialog';
import { ExecutionItemsPanel } from '../components/execution-items-panel';
import { useIssueExecutions } from '@/modules/execution/hooks/use-execution';
import type { ExecutionStatus } from '@/modules/execution/api/execution-api';
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
import { ActivityFeed } from '@/modules/activity';
import type { ActivityEntityType } from '@/modules/activity';
import { useSetViewingContext } from '@/shared/viewing-context';
import { useTranslation } from 'react-i18next';

/** 4d: 未完成执行项状态集合（与后端关单软强制校验口径一致） */
const ACTIVE_EXECUTION_STATUSES: ExecutionStatus[] = [
  'planned',
  'in_progress',
  'pending_approval',
  'blocked',
];
/** 任务终态（isFinal 状态定义的常用映射） */
const TASK_TERMINAL_STATUSES = ['done', 'canceled'];

/** 任务五态 → CapsuleSelect 选项（label 走 i18n，图标带语义底框） */
function useTaskStatusOptions() {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.entries(TASK_STATUS_VISUALS).map(([value, visual]) => ({
        value,
        label: t(visual.labelKey),
        icon: (
          <StatusIconFrame
            icon={visual.icon}
            tone={visual.tone}
            size="sm"
            spin={visual.icon === (TASK_STATUS_VISUALS.in_progress.icon)}
          />
        ),
      })),
    [t],
  );
}

function usePriorityOptions() {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.entries(PRIORITY_VISUALS)
        .filter(([value]) => value !== 'urgent') // urgent 为项目侧叫法，任务用 critical
        .map(([value, visual]) => ({
          value,
          label: t(visual.labelKey),
          icon: <visual.icon className={cn('size-3.5', TONE_TEXT_CLASS[visual.tone])} />,
        })),
    [t],
  );
}

/** 右栏建议项（i18n 文案 + 语义色图标） */
function useTaskSuggestions() {
  const { t } = useTranslation();
  return useMemo(
    () => [
      { label: t('taskDetail.sugHighPriority'), icon: AlertCircleIcon, color: 'text-accent-orange' },
      { label: t('taskDetail.sugTagFrontend'), icon: Tag, color: 'text-accent-blue' },
      { label: t('taskDetail.sugAssignMe'), icon: UserIcon, color: 'text-accent-purple' },
      { label: t('taskDetail.sugToday'), icon: CalendarIcon, color: 'text-accent-green' },
    ],
    [t],
  );
}

export function TaskDetailPage() {
  const navigate = useNavigate();
  const { issueId } = useParams<{ issueId: string }>();
  const { updateTabByPath } = useTabs();
  const { t } = useTranslation();

  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAiAssignDialog, setShowAiAssignDialog] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [asideHidden, setAsideHidden] = useState(false);
  // 行内锚点问答（候选 B）：hover 幽灵提示展开下沉线程
  const [anchorQaOpen, setAnchorQaOpen] = useState(false);
  // 4d 关单软强制：置终态被未完成执行项拦截时，记录待强制关闭的目标状态
  const [forceCloseStatus, setForceCloseStatus] = useState<string | null>(null);
  const confirmDialog = useConfirm();

  const { data: task, isLoading: taskLoading } = useTaskDetail(issueId);
  // 向 AI 助手侧边栏上报「正在查看」上下文（卸载自动清除）
  useSetViewingContext(task ? { type: 'task', id: task.id, title: task.title } : null);
  useLinearSyncEvents(task?.projectId);
  const queryClient = useQueryClient();
  const { data: acceptances = [] } = useAcceptancesByTask(task?.id);
  const { data: project } = useProjectDetail(task?.projectId);
  // 父任务（子任务详情页标题下方展示来源行，复用 query 缓存）
  const { data: parentTask } = useTaskDetail(task?.parentIssueId ?? undefined);
  const { data: integrations } = useIntegrations({ provider: 'github' });
  const githubIntegration = (integrations?.data ?? []).find((i: { provider: string }) => i.provider === 'github');
  const { data: projectListResp } = useProjectList();
  const projectList = useMemo(() => projectListResp?.items ?? [], [projectListResp]);
  const { data: milestones = [] } = useProjectMilestones(task?.projectId);
  // 负责人可选全仓注册成员（人 + AI），不要求项目绑定
  const { data: allMembers } = useMembers({ limit: 200 });
  const members = allMembers?.items ?? [];
  // V3 主负责人：真相源 TaskAssignee（Member 口径），经 useAssigneeSync 保存
  const assigneeSync = useAssigneeSync(task?.id);
  const { data: tags = [] } = useTags(task?.projectId, 'task');
  // 4d 关单联动：issue 执行项完成度
  const { data: issueExecutions = [] } = useIssueExecutions(task?.id);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const statusOptions = useTaskStatusOptions();
  const priorityOptions = usePriorityOptions();
  const suggestions = useTaskSuggestions();

  // ── prev/next 导航 (项目内)
  const nav = useEntityNavigation(task?.projectId ?? null, issueId, 'task');

  // ── 同步 Tab 标题与状态图标
  useEffect(() => {
    if (!issueId || !task?.title) return;
    const statusIcon = TASK_STATUS_VISUALS[task.status]?.icon;
    updateTabByPath(`/app/issues/${issueId}`, {
      title: task.title,
      titleKey: undefined,
      statusIcon,
    });
  }, [task?.title, task?.status, issueId, updateTabByPath]);

  // ── Hot-edit: 标题 + 描述独立 debounce 保存（保存成功后局部刷新动态时间线）
  const invalidateActivities = () => {
    if (!issueId) return;
    queryClient.invalidateQueries({ queryKey: ['activities', issueId] });
  };

  const persistTitle = useDebouncedCallback(async (value: string) => {
    if (!issueId) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === task?.title) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ issueId, data: { title: trimmed } });
      invalidateActivities();
    } catch {
      setMutationError(t('taskDetail.titleSaveFailed'));
    }
  }, 1500);

  const persistDescription = useDebouncedCallback(async (value: string) => {
    if (!issueId) return;
    if ((value || '') === (task?.description || '')) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ issueId, data: { description: value } });
      invalidateActivities();
    } catch {
      setMutationError(t('taskDetail.descSaveFailed'));
    }
  }, 1500);

  // ── 描述的本地受控草稿 + 查看/编辑态
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [descEditing, setDescEditing] = useState(false);
  // 仅在切换任务时重置，避免查询刷新打断输入（渲染期间调整，避免 effect 内同步 setState）
  const [prevTaskId, setPrevTaskId] = useState(task?.id);
  if (prevTaskId !== task?.id) {
    setPrevTaskId(task?.id);
    setDescriptionDraft(null);
    setDescEditing(false);
  }

  // ── Loading / not-found guards
  if (!issueId) {
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
          <Spinner className="size-4 mr-2 text-inherit" />
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

  // ── Status / priority visuals for current task
  const statusVisual = TASK_STATUS_VISUALS[task.status] ?? TASK_STATUS_VISUALS.todo;
  const priorityVisual = PRIORITY_VISUALS[task.priority] ?? PRIORITY_VISUALS.medium;

  // ── 4d 关单联动信号（仅工单非终态时提示，不自动改状态）
  const taskIsTerminal = TASK_TERMINAL_STATUSES.includes(task.status);
  const activeExecutionCount = issueExecutions.filter((e) =>
    ACTIVE_EXECUTION_STATUSES.includes(e.status as ExecutionStatus),
  ).length;
  const allExecutionsCompleted =
    issueExecutions.length > 0 && issueExecutions.every((e) => e.status === 'completed');
  const showExecutionSignal =
    !taskIsTerminal && (activeExecutionCount > 0 || allExecutionsCompleted || !!forceCloseStatus);

  const shortId = task.shortId || task.id.slice(0, 8);
  const currentAssigneeId = assigneeSync.primary?.memberId ?? task.assignee?.id ?? '';
  const currentProjectId = task.projectId ?? '';
  const currentMilestoneId = task.milestoneId ?? '';
  const currentLabelIds = (task.issueTags ?? []).map((t) => t.tag.id);
  const currentTag = task.issueTags?.[0]?.tag;
  const currentTagId = currentTag?.id ?? '';
  const dueDate = task.dueDate ? task.dueDate.split('T')[0] : '';
  const activityEntityType: ActivityEntityType = task.type === 'bug' ? 'bug' : 'task';

  // ── Generic mutator (用于右侧栏属性直接更新；成功后局部刷新动态时间线)
  const updateField = async (patch: Partial<UpdateTaskRequest> & { projectId?: string | null }) => {
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ issueId, data: patch });
      if (patch.status) setForceCloseStatus(null);
      invalidateActivities();
    } catch (err) {
      const serverMessage = err instanceof Error && err.message ? err.message : '';
      // 4d 关单软强制：存在未完成执行项 → toast 呈现后端文案，并提供「强制关闭」入口
      if (patch.status && serverMessage.includes('force=true')) {
        toast.error(serverMessage);
        setForceCloseStatus(patch.status);
        return;
      }
      // 展示服务端具体原因（如验收门禁 TASK_DONE_BLOCKED），无则回退通用文案
      setMutationError(serverMessage || t('taskDetail.updateFailed'));
    }
  };

  // 强制关闭：二次确认后携带 force=true 重试置终态
  const handleForceClose = async () => {
    if (!forceCloseStatus) return;
    const ok = await confirmDialog({
      title: t('taskDetail.execItemsForceCloseTitle'),
      description: t('taskDetail.execItemsForceCloseDesc'),
      confirmText: t('taskDetail.execItemsForceClose'),
      variant: 'destructive',
    });
    if (!ok) return;
    await updateField({ status: forceCloseStatus, force: true });
  };

  // ── Delete
  const handleDelete = async () => {
    setMutationError(null);
    try {
      await deleteTask.mutateAsync(issueId);
      setShowDeleteDialog(false);
      navigate('/app/issues');
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
          { label: 'Tasks', to: '/app/issues' },
          ...(project ? [{ label: project.name, to: `/app/projects/${task.projectId}` }] : []),
          { label: shortId },
        ]}
        actions={<>
          <FavoriteToggle label={task?.title ?? ''} />
          <SubscribeButton />
        </>}
        pager={
          task.projectId
            ? {
                hasPrev: nav.hasPrev && !nav.isLoading,
                hasNext: nav.hasNext && !nav.isLoading,
                onPrev: () => nav.prevId && navigate(`/app/issues/${nav.prevId}`),
                onNext: () => nav.nextId && navigate(`/app/issues/${nav.nextId}`),
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

          {/* Title：状态图标内图与标题字号一致（lg 档内图 18px、外框自然包裹），items-center 垂直居中；
              标题用系统标准页头字号 text-lg(18px)，`!` 防止基类 md:text-sm 覆盖 */}
          <div className="px-6 pt-5 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <StatusIconFrame
                icon={statusVisual.icon}
                tone={statusVisual.tone}
                size="lg"
                spin={statusVisual.icon === TASK_STATUS_VISUALS.in_progress.icon}
              />
              <AutoSizeTextarea
                key={`title-${task.id}`}
                defaultValue={task.title}
                rows={1}
                placeholder={t('taskDetail.unnamedTitle')}
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-lg! font-semibold placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            {/* 子任务来源行：父任务悬浮预览卡 + 点击跳转 */}
            {task.parentIssueId && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ListChecks className="size-3.5 shrink-0" />
                <span className="shrink-0">{t('taskDetail.parentTaskLabel')}</span>
                <RoutePreviewTrigger
                  path={`/app/issues/${task.parentIssueId}`}
                  title={parentTask?.title}
                  icon={ListChecks}
                >
                  <Link
                    to={`/app/issues/${task.parentIssueId}`}
                    className="truncate max-w-75 font-medium text-foreground transition-colors hover:text-primary hover:underline"
                  >
                    {parentTask?.title || task.parentIssueId.slice(0, 8)}
                  </Link>
                </RoutePreviewTrigger>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="font-mono">{shortId}</span>
              <span className="opacity-50">•</span>
              <span>{t('common.createdAt')} {new Date(task.createdAt).toLocaleDateString()}</span>
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

          {/* Description: markdown 查看 / 点击编辑（模块标题形态与子任务/动态一致） */}
          <div className="px-6 pt-4 pb-4 shrink-0 group/desc">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlignLeft className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('taskDetail.description')}
                </span>
              </div>
              {!descEditing && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title={t('common.edit')}
                  className="opacity-0 transition-opacity group-hover/desc:opacity-100"
                  onClick={() => setDescEditing(true)}
                >
                  <Pencil className="size-3" />
                </Button>
              )}
            </div>
            {descEditing ? (
              <MarkdownEditor
                value={descriptionDraft ?? task.description ?? ''}
                onChange={(v) => {
                  setDescriptionDraft(v);
                  persistDescription(v);
                }}
                rows={4}
                preview="live"
                hint={t('markdownEditor.hint')}
                className="w-full"
                renderInput={(p) => (
                  <MentionTextarea
                    value={p.value}
                    onChange={p.onChange}
                    rows={p.rows}
                    placeholder={p.placeholder}
                    className={cn(
                      p.className,
                      '[&_textarea]:bg-transparent [&_textarea]:rounded-none [&_textarea]:border-0 [&_textarea]:px-0 [&_textarea]:focus-visible:border-0 [&_textarea]:focus-visible:ring-0',
                    )}
                  />
                )}
              />
            ) : task.description ? (
              <button
                type="button"
                onClick={() => setDescEditing(true)}
                className="block w-full cursor-text rounded-lg text-left"
                title={t('common.edit')}
              >
                <MarkdownView content={task.description} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDescEditing(true)}
                className="block w-full cursor-text rounded-lg py-1 text-left text-sm text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              >
                {t('taskDetail.addDescription')}
              </button>
            )}
          </div>

          {/* Execution items（4d：统一执行单位，主栏与子任务同级，置于其上方） */}
          <ExecutionItemsPanel issueId={task.id} projectId={task.projectId} />

          {/* Sub-task section */}
          <SubTaskSection
            parentIssueId={task.id}
            projectId={task.projectId}
            defaultStatus={task.status}
            defaultPriority={task.priority}
            defaultAssigneeId={task.assignee?.id}
          />

          {/* Linked documents 已移至右侧栏 */}
          <div className="px-6 py-4 flex-1 min-h-0 flex flex-col">
            <ActivityFeed entityType={activityEntityType} entityId={issueId} />
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <RightSidebar hidden={asideHidden} width={320}>
          {/* Top action bar — 按钮固定一行、靠右对齐；幽灵「✨ 问 AI」hover 显形（渐进披露②） */}
          <SidebarButtonGroup className="group/sidebar justify-end">
            <AnchorQaGhostButton
              open={anchorQaOpen}
              onClick={() => setAnchorQaOpen((v) => !v)}
            />
            {/* 派发失败也可重派：已指派 AI 时按钮保留，仅文案区分 */}
            <SidebarButton
              variant="capsule"
              icon={BotIcon}
              label={task.assigneeType === 'ai_agent' ? t('taskDetail.dispatchAiAgain') : t('taskDetail.dispatchAi')}
              onClick={() => setShowAiAssignDialog(true)}
              data-ai-action="task.task-detail.assign-ai.click"
              className="text-accent-purple"
            />
            <SidebarButton
              icon={Trash2}
              label={t('common.delete')}
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            />
          </SidebarButtonGroup>

          {/* 行内锚点问答线程：就地展开 > 弹层，Esc 收起零残留 */}
          {anchorQaOpen && (
            <AnchorQaThread
              issueId={issueId ?? ''}
              projectId={task?.projectId ?? undefined}
              onOpenChange={(open) => {
                if (!open) setAnchorQaOpen(false);
              }}
              onApplyAction={async (action: AnchorQaAction) => {
                if (action.action === 'task.update_status') {
                  await updateField({ status: action.params.status });
                } else if (action.action === 'task.update_priority') {
                  await updateField({
                    priority: (action.params.priority as TaskPriority) ?? 'medium',
                  });
                } else if (action.action === 'task.update_due_date') {
                  await updateField({ dueDate: action.params.dueDate });
                }
              }}
            />
          )}

          {/* Properties */}
          <PropsCard
            title={t('taskDetail.propertiesLabel')}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow
              icon={<StatusIconFrame icon={statusVisual.icon} tone={statusVisual.tone} size="xs" spin={statusVisual.icon === TASK_STATUS_VISUALS.in_progress.icon} />}
              label={t('common.status')}
            >
              <CapsuleSelect
                value={task.status}
                active
                placeholder={t('common.none')}
                options={statusOptions}
                onChange={(v) => updateField({ status: v || 'todo' })}
              />
              {showExecutionSignal && (
                <div className="mt-1 flex flex-col items-end gap-1">
                  {activeExecutionCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-orange/10 px-2 py-0.5 text-10 text-accent-orange">
                      <ListChecks className="size-3 shrink-0" />
                      {t('taskDetail.execItemsActive', { count: activeExecutionCount })}
                    </span>
                  )}
                  {activeExecutionCount === 0 && allExecutionsCompleted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 px-2 py-0.5 text-10 text-accent-green">
                      <CheckCircle2 className="size-3 shrink-0" />
                      {t('taskDetail.execItemsReadyToClose')}
                    </span>
                  )}
                  {forceCloseStatus && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-10 text-destructive">
                      <span className="max-w-40 truncate">
                        {t('taskDetail.execItemsForceCloseHint')}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleForceClose()}
                        className="shrink-0 font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
                      >
                        {t('taskDetail.execItemsForceClose')}
                      </button>
                    </span>
                  )}
                </div>
              )}
            </PropertyRow>

            <PropertyRow
              icon={<priorityVisual.icon className={cn('size-3.5', TONE_TEXT_CLASS[priorityVisual.tone])} />}
              label={t('taskDetail.priorityLabel')}
            >
              <CapsuleSelect
                value={task.priority}
                active
                placeholder={t('common.none')}
                options={priorityOptions}
                onChange={(v) => updateField({ priority: (v || 'medium') as TaskPriority })}
              />
            </PropertyRow>

            <PropertyRow
              icon={<UserIcon className="size-3.5" />}
              label={t('taskDetail.assigneeLabel')}
            >
              <CapsuleSelect
                value={currentAssigneeId}
                active={!!assigneeSync.primary}
                placeholder={t('taskDetail.unassigned')}
                contentClassName="w-60"
                options={members.map((m) => ({
                  value: m.id,
                  label: m.type === 'ai_agent' ? `${m.displayName || m.handle} (AI)` : m.displayName || m.handle,
                  icon: <MemberAvatar name={m.displayName || m.handle} avatarUrl={m.avatarUrl} />,
                }))}
                onChange={(v) => void assigneeSync.assignTo(v || undefined)}
              />
            </PropertyRow>

            <PropertyRow icon={<Flag className="size-3.5" />} label={t('taskDetail.projectLabel')}>
              <CapsuleSelect
                value={currentProjectId}
                active={!!currentProjectId}
                placeholder={t('taskDetail.inbox')}
                options={projectList.map((p) => ({
                  value: p.id,
                  label: p.name,
                  icon: <Flag className="size-3.5 text-accent-blue" />,
                }))}
                onChange={(v) => updateField({ projectId: v || null })}
              />
            </PropertyRow>

            <PropertyRow icon={<DiamondIcon className="size-3.5 text-accent-yellow" />} label={t('taskDetail.milestoneLabel')}>
              <CapsuleSelect
                value={currentMilestoneId}
                active={!!currentMilestoneId}
                placeholder={t('common.none')}
                options={milestones.map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
                onChange={(v) => updateField({ milestoneId: v || null })}
              />
            </PropertyRow>

            <PropertyRow icon={<Tag className="size-3.5" />} label={t('taskDetail.labelsLabel')}>
              <CapsuleSelect
                value={currentTagId}
                active={currentLabelIds.length > 0}
                placeholder={currentLabelIds.length > 0 ? `${currentTag?.name}${currentLabelIds.length > 1 ? ` +${currentLabelIds.length - 1}` : ''}` : t('common.none')}
                options={tags.map((tg) => ({
                  value: tg.id,
                  label: tg.name,
                  icon: tg.color ? <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: tg.color }} /> : undefined,
                }))}
                onChange={(v) => updateField({ tags: v ? [v] : [] })}
              />
            </PropertyRow>

            <PropertyRow icon={<CalendarIcon className="size-3.5" />} label={t('taskDetail.dueDateLabel')}>
              <DateCapsuleField
                value={dueDate}
                placeholder={t('common.none')}
                clearLabel={t('taskDetail.clearDueDate')}
                onChange={(v) => updateField({ dueDate: v || undefined })}
              />
            </PropertyRow>
          </PropsCard>

          {/* 自定义字段（IssueType fieldSchema 驱动，key 挂任务 id 避免切换任务残留草稿） */}
          <CustomFieldsPanel
            key={task.id}
            issueId={task.id}
            typeId={task.typeId}
            customFields={task.customFields}
          />

          <SuggestionsCard
            title={t('taskDetail.suggestionsLabel')}
            items={suggestions}
            collapsed={suggestionsCollapsed}
            onToggle={() => setSuggestionsCollapsed((v) => !v)}
          />

          {/* Linked documents（与 Properties/Suggestions 同一套 SidebarPanel 形态） */}
          <LinkedDocsPanel issueId={task.id} />

          {task.projectId ? (
            <SidebarPanel title={t('taskDetail.externalSection')}>
              <TaskLinearPanel
                issueId={task.id}
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
                <LinearConflictResolver issueId={task.id} />
              ) : null}
            </SidebarPanel>
          ) : null}

          {/* ─── Execution ─── */}
          {githubIntegration && (
            <GithubPanel
              integrationId={githubIntegration.id}
              repoFullName={(project as unknown as { repositoryFullName?: string } | null)?.repositoryFullName}
            />
          )}

          {/* ─── 验收契约 ─── */}
          <SidebarPanel
            title={t('taskDetail.acceptanceContract')}
            icon={<CheckCircle2 className="size-3" />}
            iconClassName="text-accent-purple"
            action={
              acceptances.length > 0 ? (
                <span className="text-10 text-muted-foreground">({acceptances.length})</span>
              ) : undefined
            }
          >
            <CompletionReview issueId={task.id} acceptances={acceptances} />
          </SidebarPanel>
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
              {deleteTask.isPending ? <Spinner className="size-3 text-inherit" /> : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AI Assign dialog（收件箱任务也可指派，无项目时仅保存指派不派发） ─── */}
      <AiAssignDialog
        open={showAiAssignDialog}
        onOpenChange={setShowAiAssignDialog}
        issueId={task.id}
        projectId={task.projectId}
        taskTitle={task.title}
        defaultMemberId={task.aiAgentId ?? undefined}
      />
    </PageShell>
  );
}

// ===== SubTask Section（图2：底框状态图标 + 标签 + 优先级 + 负责人） =====

function SubTaskSection({
  parentIssueId,
  projectId,
  defaultStatus,
  defaultPriority,
  defaultAssigneeId,
}: {
  parentIssueId: string;
  projectId: string | null | undefined;
  defaultStatus: string;
  defaultPriority: string;
  defaultAssigneeId?: string;
}) {
  const { t } = useTranslation();
  const { data: subIssues = [], isLoading } = useSubTasks(parentIssueId);
  const createSubTask = useCreateSubTask();
  const [subOpen, setSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const doneCount = subIssues.filter((st) => st.status === 'done').length;

  const handleSave = async () => {
    if (!subTitle.trim()) return;
    setMutationError(null);
    try {
      await createSubTask.mutateAsync({
        title: subTitle.trim(),
        description: subDesc.trim() || undefined,
        parentIssueId,
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
    <div className="shrink-0">
      {/* Section header: 标题 + 完成进度 */}
      <div className="px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListChecks className="size-3.5" />
          {t('taskDetail.subtasks')}
          {subIssues.length > 0 && (
            <span className="text-10 font-normal normal-case tabular-nums">
              {doneCount}/{subIssues.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSubOpen((v) => !v)}
          className="size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={subOpen ? t('taskDetail.collapse') : t('taskDetail.addSubtask')}
        >
          {subOpen ? <Plus className="size-3.5 rotate-45" /> : <Plus className="size-3.5" />}
        </button>
      </div>

      {/* Sub-task list */}
      {isLoading ? (
        <div className="px-6 pb-2 text-xs text-muted-foreground">{t('common.loading')}</div>
      ) : subIssues.length > 0 ? (
        <div className="px-6 pb-1 flex flex-col gap-0.5">
          {subIssues.map((st) => {
            const visual = TASK_STATUS_VISUALS[st.status] ?? TASK_STATUS_VISUALS.todo;
            const priorityVisual = PRIORITY_VISUALS[st.priority] ?? null;
            const firstTag = st.issueTags?.[0]?.tag;
            return (
              <Link
                key={st.id}
                to={`/app/issues/${st.id}`}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/40 transition-colors group"
              >
                <StatusIconFrame
                  icon={visual.icon}
                  tone={visual.tone}
                  size="sm"
                  spin={visual.icon === TASK_STATUS_VISUALS.in_progress.icon}
                />
                <span className="flex-1 text-sm truncate group-hover:text-primary transition-colors">
                  {st.title}
                </span>
                {firstTag && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-11 text-muted-foreground shrink-0">
                    {firstTag.color && (
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: firstTag.color }} />
                    )}
                    {firstTag.name}
                  </span>
                )}
                {priorityVisual && (
                  <priorityVisual.icon className={cn('size-3.5 shrink-0', TONE_TEXT_CLASS[priorityVisual.tone])} />
                )}
                {st.dueDate && (
                  <span className="text-10 text-muted-foreground shrink-0">
                    {new Date(st.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {st.assignee && (
                  <MemberAvatar
                    name={st.assignee.displayName || st.assignee.username}
                    avatarUrl={st.assignee.avatarUrl}
                  />
                )}
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Create sub-task form（图1 创建卡形态） */}
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
              <Button variant="ghost" size="xs" onClick={() => { setSubOpen(false); setSubTitle(''); setSubDesc(''); }}>
                {t('common.cancel')}
              </Button>
              <Button size="xs" onClick={handleSave} disabled={!subTitle.trim() || createSubTask.isPending}>
                {createSubTask.isPending ? <Spinner className="size-3 text-inherit" /> : t('taskDetail.saveSubtask')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Custom Fields（右侧栏面板：IssueType fieldSchema 驱动的自定义字段查看 / 编辑） =====

function CustomFieldsPanel({
  issueId,
  typeId,
  customFields,
}: {
  issueId: string;
  typeId?: string | null;
  customFields?: Record<string, unknown> | null;
}) {
  const { t } = useTranslation();
  // 类型 fieldSchema 定义（byId 取自 issue-types 查询缓存）
  const { byId } = useIssueTypes();
  const updateTask = useUpdateTask();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const schema = useMemo(
    () =>
      ((typeId ? byId.get(typeId)?.fieldSchema : null) ?? [])
        .map((field) => ({ ...field }))
        .sort((a, b) => (a.order ?? 100) - (b.order ?? 100)),
    [typeId, byId],
  );

  // 类型未定义 fieldSchema 时整块不渲染
  if (schema.length === 0) return null;

  // 编辑草稿只含 schema 键：保存提交完整键集（服务端顶层键合并、null 删除语义）
  const startEdit = () => {
    setDraft(
      Object.fromEntries(schema.map((field) => [field.key, customFields?.[field.key] ?? null])),
    );
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateTask.mutateAsync({ issueId, data: { customFields: draft } });
      setEditing(false);
    } catch {
      // 失败提示由 useUpdateTask 的 onError toast 呈现，保持编辑态便于修正
    }
  };

  return (
    <SidebarPanel
      title={t('taskDetail.customFields')}
      icon={<ListTree className="size-3" />}
      action={
        editing ? undefined : (
          <Button variant="ghost" size="icon-xs" title={t('common.edit')} onClick={startEdit}>
            <Pencil className="size-3" />
          </Button>
        )
      }
    >
      {editing ? (
        <div className="space-y-3 p-1">
          <CustomFieldsSection
            fields={schema}
            values={draft}
            onChange={(key, value) => setDraft((prev) => ({ ...prev, [key]: value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="xs" onClick={() => void handleSave()} disabled={updateTask.isPending}>
              {updateTask.isPending ? <Spinner className="size-3 text-inherit" /> : t('common.save')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {schema.map((field) => {
            const text = formatCustomFieldValue(customFields?.[field.key]);
            return (
              <div
                key={field.key}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs"
              >
                <span className="shrink-0 text-muted-foreground">{field.label}</span>
                <span className="min-w-0 truncate text-right text-foreground">{text || '-'}</span>
              </div>
            );
          })}
        </div>
      )}
    </SidebarPanel>
  );
}

// ===== Linked Documents（右侧栏面板，形态对齐 Properties/Suggestions） =====

function LinkedDocsPanel({ issueId }: { issueId: string }) {
  const { t } = useTranslation();
  const { data: links = [], isLoading } = useTaskDocumentLinks(issueId);
  return (
    <SidebarPanel
      title={t('taskDetail.linkedDocs')}
      icon={<FileText className="size-3" />}
      action={
        links.length > 0 ? (
          <span className="text-10 text-muted-foreground">({links.length})</span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">{t('common.loading')}</div>
      ) : links.length === 0 ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">{t('taskDetail.noLinkedDocs')}</div>
      ) : (
        links.map((link) => (
          <Link
            key={link.id}
            to={`/app/documents/${link.documentId}`}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="flex-1 min-w-0 text-left">
              <span className="block truncate font-medium text-foreground">
                {link.document?.title || t('taskDetail.documentFallback', { id: link.documentId })}
              </span>
              {link.section && (
                <span className="block truncate text-10">
                  {t('taskDetail.sectionLabel', { title: link.section.title })}
                </span>
              )}
            </span>
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-10 font-medium',
                LINK_TYPE_COLORS[link.linkType] || 'bg-muted text-muted-foreground',
              )}
            >
              {t(`document.linkType.${link.linkType}`, {
                defaultValue: LINK_TYPE_LABELS[link.linkType] || link.linkType,
              })}
            </span>
          </Link>
        ))
      )}
    </SidebarPanel>
  );
}
