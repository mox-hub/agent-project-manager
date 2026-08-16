/**
 * BugDetailPage - Bug 详情页
 *
 * 与 TaskDetailPage 相同的 Linear 风格布局:
 * - Header: 面包屑 + prev/next 导航 (项目内 bugs)
 * - Main: Bug 图标 + 标题(热编辑) + 短ID + 描述(热编辑) + Bug 专属信息 + 手风琴(文档/评论)
 * - Right (320px): 顶部操作条(删除) + Properties (含 Severity, 全部可下拉) + Suggestions
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CheckCircle, FileText, XCircle, Loader2,
  ArrowLeft, Trash2,
  ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight,
  AlertCircle, Flag, User as UserIcon, Tag, CalendarIcon, Circle,
  Bug as BugIcon, MessageSquare,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
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
  useProjectMilestones,
} from '../hooks/use-project-tasks';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useProjectMembers } from '@/modules/team-member/hooks';
import { useTags } from '@/modules/core-config/hooks/use-metadata';
import { type UpdateTaskRequest, type TaskPriority, type BugSeverity } from '../api/task-api';
import { cn } from '@/lib/utils';
import { useTabs } from '@/shared/tabs/tabs-context';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import { useEntityNavigation } from '@/shared/hooks/use-entity-navigation';
import {
  useTaskDocumentLinks, LINK_TYPE_LABELS, LINK_TYPE_COLORS,
} from '@/modules/document/hooks/use-document-task-links';
import { useTranslation } from 'react-i18next';

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'S0 致命', color: '#ef4444' },
  { value: 'high', label: 'S1 严重', color: '#f97316' },
  { value: 'medium', label: 'S2 一般', color: '#eab308' },
  { value: 'low', label: 'S3 轻微', color: '#10b981' },
];

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

export function BugDetailPage() {
  const navigate = useNavigate();
  const { bugId } = useParams<{ bugId: string }>();
  const { updateTabByPath } = useTabs();

  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data: bug, isLoading: bugLoading } = useTaskDetail(bugId);
  const { data: activities } = useTaskActivities(bugId);
  const { data: project } = useProjectDetail(bug?.projectId);
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
    if (!bug || !bugId) return;
    const statusIcon = STATUS_OPTIONS.find((s) => s.value === bug.status)?.icon;
    updateTabByPath(`/app/bugs/${bugId}`, {
      title: bug.title,
      titleKey: undefined,
      statusIcon,
    });
  }, [bug?.title, bug?.status, bugId, updateTabByPath]);

  // Hot-edit
  const persistTitle = useDebouncedCallback(async (value: string) => {
    if (!bugId) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === bug?.title) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId: bugId, data: { title: trimmed } });
    } catch {
      setMutationError('标题保存失败');
    }
  }, 1500);

  const persistDescription = useDebouncedCallback(async (value: string) => {
    if (!bugId) return;
    if ((value || '') === (bug?.description || '')) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId: bugId, data: { description: value } });
    } catch {
      setMutationError('描述保存失败');
    }
  }, 1500);

  if (!bugId) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Bug 不存在</div>
      </PageShell>
    );
  }
  if (bugLoading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-4 animate-spin mr-2" />
          加载中…
        </div>
      </PageShell>
    );
  }
  if (!bug) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Bug 未找到</div>
      </PageShell>
    );
  }

  const statusOpt = STATUS_OPTIONS.find((s) => s.value === bug.status) ?? STATUS_OPTIONS[0];
  const StatusIcon = statusOpt.icon;
  const severityOpt = SEVERITY_OPTIONS.find((s) => s.value === bug.severity) ?? SEVERITY_OPTIONS[2];
  const priorityOpt = PRIORITY_OPTIONS.find((p) => p.value === bug.priority) ?? PRIORITY_OPTIONS[1];
  const PriorityIcon = priorityOpt.icon;

  const shortId = bug.shortId || bug.id.slice(0, 8);
  const currentAssigneeId = bug.assignee?.id ?? '';
  const currentProjectId = bug.projectId ?? '';
  const currentMilestoneId = bug.milestoneId ?? '';
  const currentLabelIds = (bug.taskTags ?? []).map((t) => t.tag.id);
  const currentTag = bug.taskTags?.[0]?.tag;
  const currentTagId = currentTag?.id ?? '';
  const dueDate = bug.dueDate ? bug.dueDate.split('T')[0] : '';

  const updateField = async (patch: Partial<UpdateTaskRequest> & { projectId?: string | null }) => {
    setMutationError(null);
    try {
      await updateTask.mutateAsync({ taskId: bugId, data: patch });
    } catch {
      setMutationError('更新失败');
    }
  };

  const handleDelete = async () => {
    setMutationError(null);
    try {
      await deleteTask.mutateAsync(bugId);
      setShowDeleteDialog(false);
      navigate('/app/bugs');
    } catch {
      setMutationError('删除失败');
    }
  };

  return (
    <PageShell aiPage="bugs.bug-detail" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 h-12 shrink-0 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 flex-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 px-2">
            <ArrowLeft className="size-3.5 mr-1" />
            返回
          </Button>
          <span className="opacity-50">/</span>
          <Link to="/app/bugs" className="hover:text-foreground transition-colors">Bugs</Link>
          {project && (
            <>
              <span className="opacity-50">/</span>
              <Link to={`/app/projects/${bug.projectId}`} className="hover:text-foreground transition-colors truncate">
                {project.name}
              </Link>
            </>
          )}
          <span className="opacity-50">/</span>
          <span className="text-foreground truncate font-mono">{shortId}</span>
        </div>

        {bug.projectId && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!nav.hasPrev || nav.isLoading}
              onClick={() => nav.prevId && navigate(`/app/bugs/${nav.prevId}`)}
              title="上一个 Bug"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground tabular-nums min-w-[44px] text-center">
              {nav.currentPosition > 0 ? `${nav.currentPosition}/${nav.total}` : '—/—'}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!nav.hasNext || nav.isLoading}
              onClick={() => nav.nextId && navigate(`/app/bugs/${nav.nextId}`)}
              title="下一个 Bug"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main */}
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {mutationError && (
            <div className="mx-6 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutationError}
            </div>
          )}

          {/* Title */}
          <div className="px-6 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-start gap-2">
              <BugIcon
                className="size-7 shrink-0 mt-1"
                style={{ color: severityOpt.color }}
              />
              <AutoSizeTextarea
                key={`bug-title-${bug.id}`}
                defaultValue={bug.title}
                rows={1}
                placeholder="未命名 Bug"
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-[28px] font-semibold leading-tight placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="font-mono">{shortId}</span>
              <span className="opacity-50">•</span>
              <span>Created {new Date(bug.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Description */}
          <div className="px-6 pt-4 pb-4 border-b shrink-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Description
            </label>
            <AutoSizeTextarea
              key={`bug-desc-${bug.id}`}
              defaultValue={bug.description ?? ''}
              rows={3}
              placeholder="添加描述…"
              onChange={(e) => persistDescription(e.target.value)}
              className="w-full text-sm leading-relaxed placeholder:text-muted-foreground/40 focus-visible:ring-0"
            />
          </div>

          {/* Bug specific info */}
          <div className="px-6 py-4 border-b space-y-4 shrink-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600 flex items-center gap-2">
              <BugIcon className="size-3.5" />
              Bug Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Result</label>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {bug.bugExpectedResult || <span className="text-muted-foreground/60">未填写</span>}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Actual Result</label>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {bug.bugActualResult || <span className="text-muted-foreground/60">未填写</span>}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Environment</label>
                <p className="text-sm">{bug.bugEnvironment || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Reproducibility</label>
                <p className="text-sm">{bug.bugReproducibility || '-'}</p>
              </div>
            </div>
          </div>

          {/* Expandable sections */}
          <div className="px-6 py-4 flex-1 min-h-0 flex flex-col gap-3">
            <DocumentSection taskId={bugId} />
            <DiscussionSection activities={activities} />
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-[320px] shrink-0 px-3 pb-3 pt-3 overflow-y-auto bg-transparent border-l border-border/40">
          {/* Top action bar */}
          <div className="flex items-center gap-1 mb-3 px-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
              title="删除"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

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
                value={bug.status}
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
              icon={<AlertCircle className="size-3.5" />}
              label="Severity"
            >
              <CapsuleSelect
                value={bug.severity || 'medium'}
                active
                options={SEVERITY_OPTIONS.map((s) => ({
                  value: s.value,
                  label: s.label,
                  icon: <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: s.color }} />,
                }))}
                onChange={(v) => updateField({ severity: (v || 'medium') as BugSeverity })}
              />
            </PropertyRow>

            <PropertyRow
              icon={<PriorityIcon className="size-3.5" style={{ color: priorityOpt.color }} />}
              label="Priority"
            >
              <CapsuleSelect
                value={bug.priority}
                active
                options={PRIORITY_OPTIONS.map((p) => ({
                  value: p.value,
                  label: p.label,
                  icon: <p.icon className="size-3.5" style={{ color: p.color }} />,
                }))}
                onChange={(v) => updateField({ priority: (v || 'medium') as TaskPriority })}
              />
            </PropertyRow>

            <PropertyRow icon={<UserIcon className="size-3.5" />} label="Assignee">
              <CapsuleSelect
                value={currentAssigneeId}
                active={!!currentAssigneeId}
                placeholder="Unassigned"
                contentClassName="w-[240px]"
                options={members.map((m) => ({
                  value: m.id,
                  label: m.displayName || m.handle,
                  icon: <MemberAvatar name={m.displayName || m.handle} avatarUrl={m.avatarUrl} />,
                }))}
                onChange={(v) => updateField({ assigneeId: v || undefined })}
              />
            </PropertyRow>

            <PropertyRow icon={<Flag className="size-3.5" />} label="Milestone">
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

          <div className="mt-3">
            <SuggestionsCard
              collapsed={suggestionsCollapsed}
              onToggle={() => setSuggestionsCollapsed((v) => !v)}
              items={[
                { label: 'Critical severity', icon: AlertCircle, color: 'text-red-500' },
                { label: 'Tag: bug', icon: Tag, color: 'text-red-500' },
                { label: 'Assign me', icon: UserIcon, color: 'text-violet-500' },
                { label: 'Today', icon: CalendarIcon, color: 'text-emerald-500' },
              ]}
            />
          </div>
        </aside>
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Bug</DialogTitle>
            <DialogDescription>此操作不可撤销，确定要删除 "{bug.title}" 吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTask.isPending}>
              {deleteTask.isPending ? <Loader2 className="size-3 animate-spin" /> : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          <span className="text-[10px] text-muted-foreground/60 font-normal normal-case">({count})</span>
        )}
        <ChevronDown
          className={cn('ml-auto size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="px-3 pb-3 pt-0">{children}</div>}
    </div>
  );
}

function DocumentSection({ taskId }: { taskId: string }) {
  const { data: links = [], isLoading } = useTaskDocumentLinks(taskId);
  return (
    <ExpandableSection title="关联文档" icon={FileText} count={links.length}>
      {isLoading ? (
        <div className="text-xs text-muted-foreground">加载中…</div>
      ) : links.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          暂无关联文档。在文档详情页的"关联任务"面板可添加。
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
                    {link.document?.title || `文档 ${link.documentId}`}
                  </div>
                  {link.section && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      段落: {link.section.title}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
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

function DiscussionSection({ activities }: { activities: any }) {
  const { t } = useTranslation();
  const list = (activities ?? []).slice(0, 50);
  return (
    <ExpandableSection title="评论 / 讨论" icon={MessageSquare} count={list.length}>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          {t('task.detailDrawer.noDiscussion') || '暂无讨论'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a: any) => (
            <div key={a.id} className="flex gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {a.actorId?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{a.actorId || 'System'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.summary || a.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ExpandableSection>
  );
}
