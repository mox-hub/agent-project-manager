/**
 * BugDetailPage - Bug 详情页（与 TaskDetailPage 同一套 Linear 风格改版）
 *
 * - Header: SubPageToolbar（面包屑 + prev/next 导航 + 收藏 + 侧栏开关）
 * - Main: 底框状态图标 + 标题(热编辑) + 元信息 + 描述(markdown 查看/热编辑)
 *         + Bug 专属信息 + 关联文档 + Activity 动态(评论/表情)
 * - Right (320px): 操作条(删除) + Properties(含 Severity) + Suggestions
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlignLeft,
  CalendarIcon,
  Diamond as DiamondIcon,
  FileText,
  Flag,
  ListChecks,
  Pencil,
  Tag,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
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
  useProjectMilestones,
} from '../hooks/use-project-tasks';
import { type UpdateTaskRequest, type TaskPriority, type BugSeverity } from '../api/task-api';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useProjectMembers } from '@/modules/team-member/hooks';
import { useTags } from '@/modules/core-config/hooks/use-metadata';
import { cn } from '@/lib/utils';
import { useTabs } from '@/shared/tabs/tabs-context';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import { useEntityNavigation } from '@/shared/hooks/use-entity-navigation';
import {
  useTaskDocumentLinks, LINK_TYPE_LABELS, LINK_TYPE_COLORS,
} from '@/modules/document/hooks/use-document-task-links';
import { ActivityFeed } from '@/modules/activity';
import { useTranslation } from 'react-i18next';

const SEVERITY_LABEL_KEYS = {
  critical: 'bugDetail.severityS0',
  high: 'bugDetail.severityS1',
  medium: 'bugDetail.severityS2',
  low: 'bugDetail.severityS3',
} as const;

const SEVERITY_TONES: Record<BugSeverity, string> = {
  critical: 'text-accent-red',
  high: 'text-accent-orange',
  medium: 'text-accent-yellow',
  low: 'text-accent-green',
};

export function BugDetailPage() {
  const navigate = useNavigate();
  const { bugId } = useParams<{ bugId: string }>();
  const { updateTabByPath } = useTabs();
  const { t } = useTranslation();

  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [asideHidden, setAsideHidden] = useState(false);

  const { data: bug, isLoading: bugLoading } = useTaskDetail(bugId);
  const queryClient = useQueryClient();
  const { data: project } = useProjectDetail(bug?.projectId);
  // 父任务（标题下方来源行，复用 query 缓存）
  const { data: parentTask } = useTaskDetail(bug?.parentTaskId ?? undefined);
  const { data: projectListResp } = useProjectList();
  const projectList = useMemo(() => projectListResp?.items ?? [], [projectListResp]);
  const { data: milestones = [] } = useProjectMilestones(bug?.projectId);
  const { data: members = [] } = useProjectMembers(bug?.projectId);
  const { data: tags = [] } = useTags(bug?.projectId, 'bug');

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const nav = useEntityNavigation(bug?.projectId ?? null, bugId, 'bug');

  // 同步 Tab 标题与状态图标
  useEffect(() => {
    if (!bugId || !bug?.title) return;
    const statusIcon = TASK_STATUS_VISUALS[bug.status]?.icon;
    updateTabByPath(`/app/bugs/${bugId}`, {
      title: bug.title,
      titleKey: undefined,
      statusIcon,
    });
  }, [bug?.title, bug?.status, bugId, updateTabByPath]);

  // Hot-edit（保存成功后局部刷新动态时间线）
  const invalidateActivities = () => {
    if (!bugId) return;
    queryClient.invalidateQueries({ queryKey: ['activities', bugId] });
  };

  const persistTitle = useDebouncedCallback(async (value: string) => {
    if (!bugId) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === bug?.title) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId: bugId, data: { title: trimmed } });
      invalidateActivities();
    } catch {
      setMutationError(t('bugDetail.titleSaveFailed'));
    }
  }, 1500);

  const persistDescription = useDebouncedCallback(async (value: string) => {
    if (!bugId) return;
    if ((value || '') === (bug?.description || '')) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId: bugId, data: { description: value } });
      invalidateActivities();
    } catch {
      setMutationError(t('bugDetail.descSaveFailed'));
    }
  }, 1500);

  // 描述查看/编辑态（切 bug 时重置）
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [descEditing, setDescEditing] = useState(false);
  const [prevBugId, setPrevBugId] = useState(bug?.id);
  if (prevBugId !== bug?.id) {
    setPrevBugId(bug?.id);
    setDescriptionDraft(null);
    setDescEditing(false);
  }

  if (!bugId) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">{t('bugDetail.notExists')}</div>
      </PageShell>
    );
  }
  if (bugLoading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Spinner className="size-4 mr-2 text-inherit" />
          {t('common.loading')}
        </div>
      </PageShell>
    );
  }
  if (!bug) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">{t('bugDetail.notFound')}</div>
      </PageShell>
    );
  }

  const statusVisual = TASK_STATUS_VISUALS[bug.status] ?? TASK_STATUS_VISUALS.todo;
  const severity = (bug.severity || 'medium') as BugSeverity;
  const priorityVisual = PRIORITY_VISUALS[bug.priority] ?? PRIORITY_VISUALS.medium;

  const shortId = bug.shortId || bug.id.slice(0, 8);
  const currentAssigneeId = bug.assignee?.id ?? '';
  const currentProjectId = bug.projectId ?? '';
  const currentMilestoneId = bug.milestoneId ?? '';
  const currentLabelIds = (bug.taskTags ?? []).map((t) => t.tag.id);
  const currentTag = bug.taskTags?.[0]?.tag;
  const currentTagId = currentTag?.id ?? '';
  const dueDate = bug.dueDate ? bug.dueDate.split('T')[0] : '';

  const statusOptions = Object.entries(TASK_STATUS_VISUALS).map(([value, visual]) => ({
    value,
    label: t(visual.labelKey),
    icon: (
      <StatusIconFrame
        icon={visual.icon}
        tone={visual.tone}
        size="sm"
        spin={visual.icon === TASK_STATUS_VISUALS.in_progress.icon}
      />
    ),
  }));

  const priorityOptions = Object.entries(PRIORITY_VISUALS)
    .filter(([value]) => value !== 'urgent')
    .map(([value, visual]) => ({
      value,
      label: t(visual.labelKey),
      icon: <visual.icon className={cn('size-3.5', TONE_TEXT_CLASS[visual.tone])} />,
    }));

  const severityOptions = (Object.keys(SEVERITY_LABEL_KEYS) as BugSeverity[]).map((value) => ({
    value,
    label: t(SEVERITY_LABEL_KEYS[value]),
    icon: <span className={cn('inline-block size-2.5 rounded-full bg-current', SEVERITY_TONES[value])} />,
  }));

  const updateField = async (patch: Partial<UpdateTaskRequest> & { projectId?: string | null }) => {
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId: bugId, data: patch });
      invalidateActivities();
    } catch {
      setMutationError(t('bugDetail.updateFailed'));
    }
  };

  const handleDelete = async () => {
    setMutationError(null);
    try {
      await deleteTask.mutateAsync(bugId);
      setShowDeleteDialog(false);
      navigate('/app/bugs');
    } catch {
      setMutationError(t('bugDetail.deleteFailed'));
    }
  };

  return (
    <PageShell aiPage="bugs.bug-detail" className="overflow-hidden">
      {/* SubPageToolbar：返回 + 面包屑 + 翻页器 + 侧栏开关 */}
      <SubPageToolbar
        aiId="bugs.bug-detail"
        backLabel={t('common.back')}
        breadcrumbs={[
          { label: 'Bugs', to: '/app/bugs' },
          ...(project ? [{ label: project.name, to: `/app/projects/${bug.projectId}` }] : []),
          { label: shortId },
        ]}
        actions={<FavoriteToggle label={bug?.title ?? ''} />}
        pager={
          bug.projectId
            ? {
                hasPrev: nav.hasPrev && !nav.isLoading,
                hasNext: nav.hasNext && !nav.isLoading,
                onPrev: () => nav.prevId && navigate(`/app/bugs/${nav.prevId}`),
                onNext: () => nav.nextId && navigate(`/app/bugs/${nav.nextId}`),
                position: nav.currentPosition > 0 ? `${nav.currentPosition}/${nav.total}` : '—',
              }
            : undefined
        }
        sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
      />

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main */}
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {mutationError && (
            <div className="mx-6 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutationError}
            </div>
          )}

          {/* Title：状态图标内图与标题字号一致（lg 档内图 18px、外框自然包裹），items-center 垂直居中 */}
          <div className="px-6 pt-5 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <StatusIconFrame
                icon={statusVisual.icon}
                tone={statusVisual.tone}
                size="lg"
                spin={statusVisual.icon === TASK_STATUS_VISUALS.in_progress.icon}
              />
              <AutoSizeTextarea
                key={`bug-title-${bug.id}`}
                defaultValue={bug.title}
                rows={1}
                placeholder={t('bugDetail.unnamedTitle')}
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-lg! font-semibold placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            {/* 子任务来源行：父任务悬浮预览卡 + 点击跳转 */}
            {bug.parentTaskId && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ListChecks className="size-3.5 shrink-0" />
                <span className="shrink-0">{t('bugDetail.parentTaskLabel')}</span>
                <RoutePreviewTrigger
                  path={`/app/tasks/${bug.parentTaskId}`}
                  title={parentTask?.title}
                  icon={ListChecks}
                >
                  <Link
                    to={`/app/tasks/${bug.parentTaskId}`}
                    className="truncate max-w-75 font-medium text-foreground transition-colors hover:text-primary hover:underline"
                  >
                    {parentTask?.title || bug.parentTaskId.slice(0, 8)}
                  </Link>
                </RoutePreviewTrigger>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="font-mono">{shortId}</span>
              <span className="opacity-50">•</span>
              <span>{t('common.createdAt')} {new Date(bug.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Description: markdown 查看 / 点击编辑（模块标题形态与动态一致） */}
          <div className="px-6 pt-4 pb-4 shrink-0 group/desc">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlignLeft className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('bugDetail.description')}
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
                value={descriptionDraft ?? bug.description ?? ''}
                onChange={(v) => {
                  setDescriptionDraft(v);
                  persistDescription(v);
                }}
                rows={4}
                preview="live"
                hint={t('markdownEditor.hint')}
                className="w-full"
                inputClassName="focus-visible:ring-0"
              />
            ) : bug.description ? (
              <button
                type="button"
                onClick={() => setDescEditing(true)}
                className="block w-full cursor-text rounded-lg text-left"
                title={t('common.edit')}
              >
                <MarkdownView content={bug.description} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDescEditing(true)}
                className="block w-full cursor-text rounded-lg py-1 text-left text-sm text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              >
                {t('bugDetail.addDescription')}
              </button>
            )}
          </div>

          {/* Bug specific info */}
          <div className="px-6 py-4 space-y-4 shrink-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-red flex items-center gap-2">
              <FileText className="size-3.5" />
              {t('bugDetail.infoTitle')}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t('bugDetail.expectedResult')}</label>
                <MarkdownView
                  content={bug.bugExpectedResult || `*${t('bugDetail.emptyValue')}*`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t('bugDetail.actualResult')}</label>
                <MarkdownView
                  content={bug.bugActualResult || `*${t('bugDetail.emptyValue')}*`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t('bugDetail.environment')}</label>
                <p className="text-sm">{bug.bugEnvironment || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t('bugDetail.reproducibility')}</label>
                <p className="text-sm">{bug.bugReproducibility || '-'}</p>
              </div>
            </div>
          </div>

          {/* Linked documents 已移至右侧栏 */}
          <div className="px-6 py-4 flex-1 min-h-0 flex flex-col">
            <ActivityFeed entityType="bug" entityId={bugId} />
          </div>
        </div>

        {/* Right sidebar */}
        <RightSidebar hidden={asideHidden} width={320}>
          {/* Top action bar — 靠右对齐 */}
          <SidebarButtonGroup className="justify-end">
            <SidebarButton
              icon={Trash2}
              label={t('common.delete')}
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            />
          </SidebarButtonGroup>

          <PropsCard
            title={t('bugDetail.propertiesLabel')}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow
              icon={<StatusIconFrame icon={statusVisual.icon} tone={statusVisual.tone} size="xs" spin={statusVisual.icon === TASK_STATUS_VISUALS.in_progress.icon} />}
              label={t('common.status')}
            >
              <CapsuleSelect
                value={bug.status}
                active
                placeholder={t('common.none')}
                options={statusOptions}
                onChange={(v) => updateField({ status: v || 'todo' })}
              />
            </PropertyRow>

            <PropertyRow
              icon={<span className={cn('inline-block size-2.5 rounded-full bg-current', SEVERITY_TONES[severity])} />}
              label={t('bugDetail.severityLabel')}
            >
              <CapsuleSelect
                value={severity}
                active
                options={severityOptions}
                onChange={(v) => updateField({ severity: (v || 'medium') as BugSeverity })}
              />
            </PropertyRow>

            <PropertyRow
              icon={<priorityVisual.icon className={cn('size-3.5', TONE_TEXT_CLASS[priorityVisual.tone])} />}
              label={t('bugDetail.priorityLabel')}
            >
              <CapsuleSelect
                value={bug.priority}
                active
                placeholder={t('common.none')}
                options={priorityOptions}
                onChange={(v) => updateField({ priority: (v || 'medium') as TaskPriority })}
              />
            </PropertyRow>

            <PropertyRow icon={<UserIcon className="size-3.5" />} label={t('bugDetail.assigneeLabel')}>
              <CapsuleSelect
                value={currentAssigneeId}
                active={!!currentAssigneeId}
                placeholder={t('bugDetail.unassigned')}
                contentClassName="w-60"
                options={members.map((m) => ({
                  value: m.id,
                  label: m.displayName || m.handle,
                  icon: <MemberAvatar name={m.displayName || m.handle} avatarUrl={m.avatarUrl} />,
                }))}
                onChange={(v) => updateField({ assigneeId: v || undefined })}
              />
            </PropertyRow>

            <PropertyRow icon={<DiamondIcon className="size-3.5 text-accent-yellow" />} label={t('bugDetail.milestoneLabel')}>
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

            <PropertyRow icon={<Flag className="size-3.5" />} label={t('bugDetail.projectLabel')}>
              <CapsuleSelect
                value={currentProjectId}
                active={!!currentProjectId}
                placeholder={t('bugDetail.inbox')}
                options={projectList.map((p) => ({
                  value: p.id,
                  label: p.name,
                  icon: <Flag className="size-3.5 text-accent-blue" />,
                }))}
                onChange={(v) => updateField({ projectId: v || null })}
              />
            </PropertyRow>

            <PropertyRow icon={<Tag className="size-3.5" />} label={t('bugDetail.labelsLabel')}>
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

            <PropertyRow icon={<CalendarIcon className="size-3.5" />} label={t('bugDetail.dueDateLabel')}>
              <DateCapsuleField
                value={dueDate}
                placeholder={t('common.none')}
                clearLabel={t('bugDetail.clearDueDate')}
                onChange={(v) => updateField({ dueDate: v || undefined })}
              />
            </PropertyRow>
          </PropsCard>

          <SuggestionsCard
            title={t('bugDetail.suggestionsLabel')}
            collapsed={suggestionsCollapsed}
            onToggle={() => setSuggestionsCollapsed((v) => !v)}
            items={[
              { label: t('bugDetail.sugCriticalSeverity'), icon: Flag, color: 'text-accent-red' },
              { label: t('bugDetail.sugTagBug'), icon: Tag, color: 'text-accent-red' },
              { label: t('bugDetail.sugAssignMe'), icon: UserIcon, color: 'text-accent-purple' },
              { label: t('bugDetail.sugToday'), icon: CalendarIcon, color: 'text-accent-green' },
            ]}
          />

          {/* Linked documents（与 Properties/Suggestions 同一套 SidebarPanel 形态） */}
          <LinkedDocsPanel taskId={bugId} />
        </RightSidebar>
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bugDetail.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('bugDetail.deleteConfirm', { title: bug.title })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTask.isPending}>
              {deleteTask.isPending ? <Spinner className="size-3 text-inherit" /> : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

// ===== Linked Documents（右侧栏面板，形态对齐 Properties/Suggestions） =====

function LinkedDocsPanel({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const { data: links = [], isLoading } = useTaskDocumentLinks(taskId);
  return (
    <SidebarPanel
      title={t('bugDetail.linkedDocs')}
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
        <div className="px-2 py-1.5 text-xs text-muted-foreground">{t('bugDetail.noLinkedDocs')}</div>
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
                {link.document?.title || t('bugDetail.documentFallback', { id: link.documentId })}
              </span>
              {link.section && (
                <span className="block truncate text-10">
                  {t('bugDetail.sectionLabel', { title: link.section.title })}
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
