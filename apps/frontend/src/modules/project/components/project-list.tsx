import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Project,
  ProjectHealthStatus,
  ProjectPriority,
  ProjectWorkflowStatus,
  UpdateProjectRequest,
} from '../api/project-api';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronsUp,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CirclePause,
  Clock3,
  Copy,
  FolderKanban,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Rocket,
  Slash,
  Sparkles,
  Target,
  Wrench,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { MENU_ITEM_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type EditableField =
  | 'workflowStatus'
  | 'priority'
  | 'ownerId'
  | 'startDate'
  | 'targetDate'
  | 'progress'
  | 'healthStatus';

export interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  onCreateClick: () => void;
  viewMode?: 'list' | 'grid' | 'board';
  onPatchProject?: (projectId: string, data: UpdateProjectRequest) => Promise<void>;
  visibleColumns?: ProjectListColumnKey[];
}

const PRIORITY_STYLE: Record<ProjectPriority, { icon: string; text: string; ring: string }> = {
  low: { icon: 'text-sky-500', text: 'text-sky-600 dark:text-sky-300', ring: 'bg-sky-500/15 ring-sky-500/30' },
  medium: { icon: 'text-violet-500', text: 'text-violet-600 dark:text-violet-300', ring: 'bg-violet-500/15 ring-violet-500/30' },
  high: { icon: 'text-amber-500', text: 'text-amber-600 dark:text-amber-300', ring: 'bg-amber-500/15 ring-amber-500/30' },
  urgent: { icon: 'text-rose-500', text: 'text-rose-600 dark:text-rose-300', ring: 'bg-rose-500/15 ring-rose-500/30' },
};

const HEALTH_STYLE: Record<ProjectHealthStatus, { icon: string; text: string; ring: string }> = {
  on_track: { icon: 'text-emerald-500', text: 'text-emerald-600 dark:text-emerald-300', ring: 'bg-emerald-500/15 ring-emerald-500/30' },
  at_risk: { icon: 'text-amber-500', text: 'text-amber-600 dark:text-amber-300', ring: 'bg-amber-500/15 ring-amber-500/30' },
  off_track: { icon: 'text-rose-500', text: 'text-rose-600 dark:text-rose-300', ring: 'bg-rose-500/15 ring-rose-500/30' },
};

const WORKFLOW_STYLE: Record<ProjectWorkflowStatus, string> = {
  backlog: 'bg-content-bg-secondary text-content-text-muted',
  planned: 'bg-indigo-500/15 text-indigo-300',
  in_progress: 'bg-sky-500/15 text-sky-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  canceled: 'bg-zinc-500/15 text-zinc-300',
};

const WORKFLOW_ICON_STYLE: Record<ProjectWorkflowStatus, string> = {
  backlog: 'text-content-text-muted',
  planned: 'text-indigo-300',
  in_progress: 'text-sky-300',
  completed: 'text-emerald-300',
  canceled: 'text-zinc-300',
};

const WORKFLOW_OPTIONS: { value: ProjectWorkflowStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
];

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const HEALTH_OPTIONS: { value: ProjectHealthStatus; label: string }[] = [
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'off_track', label: 'Off Track' },
];

const COLUMNS = [
  { key: 'icon', label: 'Icon', minWidth: 72, flex: 0.5 },
  { key: 'name', label: 'Name', minWidth: 240, flex: 2.2 },
  { key: 'health', label: 'Health', minWidth: 110, flex: 1 },
  { key: 'priority', label: 'Priority', minWidth: 110, flex: 0.8 },
  { key: 'owner', label: 'Owner', minWidth: 140, flex: 1.1 },
  { key: 'members', label: 'Members', minWidth: 90, flex: 0.8 },
  { key: 'start', label: 'Start', minWidth: 100, flex: 0.8 },
  { key: 'target', label: 'Target', minWidth: 100, flex: 0.8 },
  { key: 'progress', label: 'Progress', minWidth: 140, flex: 1 },
  { key: 'updated', label: 'Updated', minWidth: 110, flex: 0.9 },
  { key: 'status', label: 'Status', minWidth: 120, flex: 1 },
] as const;

export type ProjectListColumnKey = (typeof COLUMNS)[number]['key'];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getHealthIcon(status?: ProjectHealthStatus) {
  const safeStatus = status || 'at_risk';
  if (safeStatus === 'on_track') {
    return (
      <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full ring-1', HEALTH_STYLE[safeStatus].ring)}>
        <CircleCheck size={13} className={HEALTH_STYLE[safeStatus].icon} />
      </span>
    );
  }
  if (safeStatus === 'off_track') {
    return (
      <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full ring-1', HEALTH_STYLE[safeStatus].ring)}>
        <CircleAlert size={13} className={HEALTH_STYLE[safeStatus].icon} />
      </span>
    );
  }
  return (
    <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full ring-1', HEALTH_STYLE[safeStatus].ring)}>
      <CirclePause size={13} className={HEALTH_STYLE[safeStatus].icon} />
    </span>
  );
}

function getPriorityIcon(priority: ProjectPriority) {
  if (priority === 'urgent') return <ChevronsUp size={13} className={PRIORITY_STYLE[priority].icon} />;
  if (priority === 'high') return <ArrowUp size={13} className={PRIORITY_STYLE[priority].icon} />;
  if (priority === 'low') return <ArrowDown size={13} className={PRIORITY_STYLE[priority].icon} />;
  return <Slash size={13} className={PRIORITY_STYLE[priority].icon} />;
}

function getWorkflowIcon(status: ProjectWorkflowStatus) {
  if (status === 'completed') return <CheckCircle2 size={13} className={WORKFLOW_ICON_STYLE[status]} />;
  if (status === 'in_progress') return <LoaderCircle size={13} className={cn('animate-spin', WORKFLOW_ICON_STYLE[status])} />;
  if (status === 'planned') return <Clock3 size={13} className={WORKFLOW_ICON_STYLE[status]} />;
  if (status === 'canceled') return <CirclePause size={13} className={WORKFLOW_ICON_STYLE[status]} />;
  return <CircleDashed size={13} className={WORKFLOW_ICON_STYLE[status]} />;
}

function getProjectIconNode(icon?: string | null) {
  if (icon === 'rocket') return <Rocket size={13} />;
  if (icon === 'target') return <Target size={13} />;
  if (icon === 'tooling') return <Wrench size={13} />;
  if (icon === 'spark') return <Sparkles size={13} />;
  return <FolderKanban size={13} />;
}

function getSourceBadgeText(source?: Project['source']) {
  if (!source) return 'local';
  if (source === 'github_projects') return 'github';
  return source;
}

function CellButton({
  onClick,
  children,
  title,
  aiComponent,
  aiAction,
  aiRole = 'select',
}: {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  title?: string;
  aiComponent?: string;
  aiAction?: string;
  aiRole?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="inline-flex min-h-7 items-center gap-1.5 rounded px-1.5 text-left text-sm transition-colors hover:bg-content-bg-secondary"
      data-ai-component={aiComponent}
      data-ai-action={aiAction}
      data-ai-role={aiRole}
    >
      {children}
    </button>
  );
}

export function ProjectList({
  projects,
  isLoading,
  onCreateClick,
  viewMode = 'list',
  onPatchProject,
  visibleColumns,
}: ProjectListProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{
    projectId: string;
    field: EditableField;
    anchorRect: DOMRect;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editQuery, setEditQuery] = useState('');
  const [actionOpen, setActionOpen] = useState<string | null>(null);

  const projectList = useMemo(() => (Array.isArray(projects) ? projects : []), [projects]);

  const memberLookup = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    projectList.forEach((project) => {
      project.members?.forEach((member) => {
        map.set(member.user.id, {
          id: member.user.id,
          label: member.user.displayName || member.user.username,
        });
      });
    });
    return Array.from(map.values());
  }, [projectList]);

  const activeEditProject = projectList.find((project) => project.id === editing?.projectId);
  const visibleColumnSet = useMemo(
    () => new Set(visibleColumns && visibleColumns.length > 0 ? visibleColumns : COLUMNS.map((col) => col.key)),
    [visibleColumns],
  );
  const visibleColumnDefs = useMemo(
    () => COLUMNS.filter((col) => visibleColumnSet.has(col.key)),
    [visibleColumnSet],
  );

  const openEditor = (event: MouseEvent<HTMLButtonElement>, projectId: string, field: EditableField) => {
    event.stopPropagation();
    setEditError(null);
    setEditQuery('');
    setEditing({ projectId, field, anchorRect: event.currentTarget.getBoundingClientRect() });
  };

  async function patchProject(projectId: string, data: UpdateProjectRequest) {
    if (!onPatchProject) {
      setEditError('当前页面未注入更新能力，无法保存改动。');
      return;
    }
    try {
      setSaving(true);
      setEditError(null);
      await onPatchProject(projectId, data);
      setEditing(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : '保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-content-text-muted">
        Loading projects...
      </div>
    );
  }

  if (projectList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-content-bg-secondary">
          <FolderKanban size={28} className="text-content-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-content-text">No projects yet</p>
          <p className="mt-1 text-sm text-content-text-muted">
            Create your first project to get started.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/90"
          data-ai-component="project.project-list.empty.create"
          data-ai-action="project.project-list.empty.create.click"
          data-ai-role="submit"
        >
          <Plus size={14} />
          New project
        </button>
      </div>
    );
  }

  if (viewMode !== 'list') {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-content-text-muted">
        Switch to list view for inline editing.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto text-sm">
      <div
        className="grid w-full gap-2 border-b border-content-border px-2 py-2 text-xs font-medium uppercase tracking-[0.03em] text-content-text-muted"
        style={{
          gridTemplateColumns: `${visibleColumnDefs.map((c) => `minmax(${c.minWidth}px, ${c.flex}fr)`).join(' ')} 36px`,
        }}
      >
        {visibleColumnDefs.map((col) => (
          <div key={col.key}>{col.label}</div>
        ))}
        <div />
      </div>

      {projectList.map((project) => {
        const members = project.members ?? [];
        const rowUpdatedAt = project.lastActivityAt || project.updatedAt;
        const owner = project.owner || members.find((m) => m.role === 'owner')?.user;
        const color = project.color || '#5E6AD2';
        const progress = Math.max(0, Math.min(100, project.progress ?? 0));
        const workflowStatus = project.workflowStatus || 'planned';
        const priority = project.priority || 'medium';
        const healthStatus = project.healthStatus || 'at_risk';

        return (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/app/projects/${project.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/app/projects/${project.id}`);
              }
            }}
            className="group relative grid w-full min-w-0 items-center gap-2 border-b border-content-border-light px-2 py-2 transition-colors hover:bg-content-bg-secondary/50"
            style={{
              gridTemplateColumns: `${visibleColumnDefs.map((c) => `minmax(${c.minWidth}px, ${c.flex}fr)`).join(' ')} 36px`,
            }}
            data-ai-component={`project.project-list.row.${project.id}`}
            data-ai-role="content"
          >
            {visibleColumnDefs.map((col) => {
              if (col.key === 'name') {
                return (
                  <div key={col.key} className="relative min-w-0 pr-14">
                    <span className="block truncate font-medium text-content-text">{project.name}</span>
                    <span className="absolute right-0 top-0 rounded-full border border-content-border bg-content-bg-secondary px-1.5 py-0.5 text-[9px] leading-none uppercase text-content-text-muted">
                      {getSourceBadgeText(project.source)}
                    </span>
                  </div>
                );
              }
              if (col.key === 'icon') {
                return (
                  <div key={col.key} className="flex items-center">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white"
                      style={{ background: color }}
                      title={project.icon || 'folder'}
                    >
                      {getProjectIconNode(project.icon)}
                    </span>
                  </div>
                );
              }
              if (col.key === 'health') {
                return (
                  <CellButton
                    key={col.key}
                    onClick={(event) => openEditor(event, project.id, 'healthStatus')}
                    aiComponent={`project.project-list.row.${project.id}.health`}
                    aiAction={`project.project-list.row.${project.id}.health.edit`}
                  >
                    {getHealthIcon(healthStatus)}
                    <span className={cn('capitalize font-medium', HEALTH_STYLE[healthStatus].text)}>
                      {healthStatus.replace('_', ' ')}
                    </span>
                  </CellButton>
                );
              }
              if (col.key === 'priority') {
                return (
                  <CellButton
                    key={col.key}
                    onClick={(event) => openEditor(event, project.id, 'priority')}
                    aiComponent={`project.project-list.row.${project.id}.priority`}
                    aiAction={`project.project-list.row.${project.id}.priority.edit`}
                  >
                    <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full ring-1', PRIORITY_STYLE[priority].ring)}>
                      {getPriorityIcon(priority)}
                    </span>
                    <span className={cn('capitalize font-medium', PRIORITY_STYLE[priority].text)}>{priority}</span>
                  </CellButton>
                );
              }
              if (col.key === 'owner') {
                return (
                  <CellButton
                    key={col.key}
                    onClick={(event) => openEditor(event, project.id, 'ownerId')}
                    aiComponent={`project.project-list.row.${project.id}.owner`}
                    aiAction={`project.project-list.row.${project.id}.owner.edit`}
                  >
                    {owner ? (
                      <>
                        <Avatar className="h-5 w-5">
                          {owner.avatarUrl ? <AvatarImage src={owner.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-[10px]">
                            {(owner.displayName || owner.username).slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{owner.displayName || owner.username}</span>
                      </>
                    ) : (
                      <>
                        <UserRound size={14} className="text-content-text-muted" />
                        <span className="text-content-text-muted">Unassigned</span>
                      </>
                    )}
                  </CellButton>
                );
              }
              if (col.key === 'members') {
                return (
                  <div key={col.key} className="flex -space-x-2">
                    {members.slice(0, 4).map((member) => (
                      <Avatar key={member.user.id} className="h-6 w-6 border border-content-border" title={member.user.displayName || member.user.username}>
                        {member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-[10px]">
                          {(member.user.displayName || member.user.username).slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                );
              }
              if (col.key === 'start') {
                return (
                  <CellButton
                    key={col.key}
                    onClick={(event) => openEditor(event, project.id, 'startDate')}
                    aiComponent={`project.project-list.row.${project.id}.start-date`}
                    aiAction={`project.project-list.row.${project.id}.start-date.edit`}
                  >
                    <Calendar size={14} className="text-content-text-muted" />
                    <span>{formatDate(project.startDate)}</span>
                  </CellButton>
                );
              }
              if (col.key === 'target') {
                return (
                  <CellButton
                    key={col.key}
                    onClick={(event) => openEditor(event, project.id, 'targetDate')}
                    aiComponent={`project.project-list.row.${project.id}.target-date`}
                    aiAction={`project.project-list.row.${project.id}.target-date.edit`}
                  >
                    <Calendar size={14} className="text-content-text-muted" />
                    <span>{formatDate(project.targetDate)}</span>
                  </CellButton>
                );
              }
              if (col.key === 'progress') {
                return (
                  <CellButton
                    key={col.key}
                    onClick={(event) => openEditor(event, project.id, 'progress')}
                    aiComponent={`project.project-list.row.${project.id}.progress`}
                    aiAction={`project.project-list.row.${project.id}.progress.edit`}
                  >
                    <div className="h-1.5 w-16 rounded bg-content-bg-secondary">
                      <div className="h-1.5 rounded bg-accent-blue" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="tabular-nums text-content-text-secondary">{progress}%</span>
                  </CellButton>
                );
              }
              if (col.key === 'updated') {
                return <div key={col.key} className="text-content-text-secondary">{formatDate(rowUpdatedAt)}</div>;
              }
              return (
                <CellButton
                  key={col.key}
                  onClick={(event) => openEditor(event, project.id, 'workflowStatus')}
                  aiComponent={`project.project-list.row.${project.id}.workflow-status`}
                  aiAction={`project.project-list.row.${project.id}.workflow-status.edit`}
                >
                  <span className={cn('inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs capitalize', WORKFLOW_STYLE[workflowStatus])}>
                    {getWorkflowIcon(workflowStatus)}
                    <span>{workflowStatus.replace('_', ' ')}</span>
                  </span>
                </CellButton>
              );
            })}

            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionOpen((prev) => (prev === project.id ? null : project.id));
                }}
                data-ai-component={`project.project-list.row.${project.id}.actions-toggle`}
                data-ai-action={`project.project-list.row.${project.id}.actions-toggle.click`}
                data-ai-role="jump"
              >
                <MoreHorizontal size={14} />
              </Button>
              {actionOpen === project.id && (
                <div
                  className={`absolute right-0 z-20 mt-1 w-40 p-1 motion-enter ${MENU_SURFACE_CLASS}`}
                  onClick={(e) => e.stopPropagation()}
                  data-ai-component={`project.project-list.row.${project.id}.actions-menu`}
                  data-ai-role="panel"
                >
                  <button
                    type="button"
                    className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left`}
                    onClick={() => navigate(`/app/projects/${project.id}`)}
                    data-ai-component={`project.project-list.row.${project.id}.open-details`}
                    data-ai-action={`project.project-list.row.${project.id}.open-details.click`}
                    data-ai-role="jump"
                  >
                    Open details
                  </button>
                  <button
                    type="button"
                    className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left`}
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/app/projects/${project.id}`);
                      setActionOpen(null);
                    }}
                    data-ai-component={`project.project-list.row.${project.id}.copy-link`}
                    data-ai-action={`project.project-list.row.${project.id}.copy-link.click`}
                    data-ai-role="jump"
                  >
                    <Copy size={14} />
                    Copy link
                  </button>
                  <button
                    type="button"
                    className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left text-rose-400 hover:bg-rose-500/10 hover:text-rose-500`}
                    onClick={async () => {
                      await patchProject(project.id, { status: 'archived' });
                      setActionOpen(null);
                    }}
                    data-ai-component={`project.project-list.row.${project.id}.archive`}
                    data-ai-action={`project.project-list.row.${project.id}.archive.click`}
                    data-ai-role="danger"
                  >
                    Archive
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {editing && activeEditProject && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              if (!saving) {
                setEditing(null);
                setEditError(null);
              }
            }}
          />
          <CompactEditorMenu
            editing={editing}
            project={activeEditProject}
            saving={saving}
            error={editError}
            query={editQuery}
            onQueryChange={setEditQuery}
            members={memberLookup}
            onPatch={patchProject}
            onClose={() => {
              if (!saving) {
                setEditing(null);
                setEditError(null);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function DateEditor({
  initialValue,
  onSubmit,
  saving,
  label,
}: {
  initialValue?: string | null;
  onSubmit: (value: string | null) => Promise<void>;
  saving: boolean;
  label: string;
}) {
  const [value, setValue] = useState(() => (initialValue ? initialValue.slice(0, 10) : ''));
  return (
    <div className="space-y-3">
      <Input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-md border border-content-border bg-content-bg-secondary px-3 py-2 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(value ? `${value}T00:00:00.000Z` : null)}
          disabled={saving}
        >
          Save {label}
        </Button>
      </div>
    </div>
  );
}

function CompactEditorMenu({
  editing,
  project,
  saving,
  error,
  query,
  onQueryChange,
  members,
  onPatch,
  onClose,
}: {
  editing: { projectId: string; field: EditableField; anchorRect: DOMRect };
  project: Project;
  saving: boolean;
  error: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  members: { id: string; label: string }[];
  onPatch: (projectId: string, data: UpdateProjectRequest) => Promise<void>;
  onClose: () => void;
}) {
  const aiBase = `project.project-list.editor.${project.id}.${editing.field}`;
  const width = editing.field === 'ownerId' ? 320 : 300;
  const estimatedHeight = editing.field === 'ownerId' ? 360 : editing.field === 'progress' ? 220 : 320;

  let left = editing.anchorRect.left;
  if (left + width > window.innerWidth - 12) {
    left = editing.anchorRect.right - width;
  }
  left = Math.max(12, left);

  let top = editing.anchorRect.bottom + 8;
  if (top + estimatedHeight > window.innerHeight - 12) {
    top = Math.max(12, editing.anchorRect.top - estimatedHeight - 8);
  }

  const priorityOptions = PRIORITY_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );
  const workflowOptions = WORKFLOW_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );
  const healthOptions = HEALTH_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );
  const ownerOptions = members.filter((member) =>
    member.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed z-50 overflow-hidden rounded-xl border border-content-border bg-content-bg shadow-2xl motion-enter"
      style={{ width, left, top }}
      onClick={(event) => event.stopPropagation()}
      data-ai-component={aiBase}
      data-ai-role="panel"
    >
      <div className="border-b border-content-border p-2">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={`Change ${editing.field.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
          className="h-8 text-xs"
          autoFocus
          data-ai-component={`${aiBase}.search`}
          data-ai-action={`${aiBase}.search.change`}
        />
      </div>

      {error && (
        <div className="mx-2 mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-400">
          {error}
        </div>
      )}

      <div className="max-h-[260px] overflow-y-auto p-2">
        {editing.field === 'priority' && (
          <div className="space-y-1">
            {priorityOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => onPatch(project.id, { priority: option.value })}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-content-bg-secondary',
                  project.priority === option.value && 'bg-content-bg-secondary',
                )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full ring-1', PRIORITY_STYLE[option.value].ring)}>
                      {getPriorityIcon(option.value)}
                    </span>
                    <span className={PRIORITY_STYLE[option.value].text}>{option.label}</span>
                  </span>
                <span className="text-xs text-content-text-muted">{index + 1}</span>
              </button>
            ))}
          </div>
        )}

        {editing.field === 'workflowStatus' && (
          <div className="space-y-1">
            {workflowOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => onPatch(project.id, { workflowStatus: option.value })}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-content-bg-secondary',
                  project.workflowStatus === option.value && 'bg-content-bg-secondary',
                )}
                >
                  <span className="inline-flex items-center gap-2">
                    {getWorkflowIcon(option.value)}
                    <span>{option.label}</span>
                  </span>
                  <span className="text-xs text-content-text-muted">{index + 1}</span>
                </button>
              ))}
          </div>
        )}

        {editing.field === 'healthStatus' && (
          <div className="space-y-1">
            {healthOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => onPatch(project.id, { healthStatus: option.value })}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-content-bg-secondary',
                  project.healthStatus === option.value && 'bg-content-bg-secondary',
                )}
              >
                <span className="flex items-center gap-2">
                  {getHealthIcon(option.value)}
                  <span className={HEALTH_STYLE[option.value].text}>{option.label}</span>
                </span>
                <span className="text-xs text-content-text-muted">{index + 1}</span>
              </button>
            ))}
          </div>
        )}

        {editing.field === 'ownerId' && (
          <Combobox
            value={project.owner?.id ?? ""}
            onValueChange={(value) => onPatch(project.id, { ownerId: value || null })}
            disabled={saving}
          >
            <ComboboxInput className="w-full" placeholder="Search owner..." />
            <ComboboxContent>
              <ComboboxList>
                <ComboboxItem value="">
                  <UserRound size={14} />
                  Unassigned
                </ComboboxItem>
                {ownerOptions.map((member) => (
                  <ComboboxItem key={member.id} value={member.id}>
                    <UserRound size={14} />
                    {member.label}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}

        {(editing.field === 'startDate' || editing.field === 'targetDate') && (
          <DateEditor
            label={editing.field}
            initialValue={editing.field === 'startDate' ? project.startDate : project.targetDate}
            onSubmit={(value) =>
              onPatch(project.id, {
                [editing.field]: value,
              } as UpdateProjectRequest)
            }
            saving={saving}
          />
        )}

        {editing.field === 'progress' && (
          <ProgressEditor
            initialValue={project.progress ?? 0}
            onSubmit={(value) => onPatch(project.id, { progress: value })}
            saving={saving}
          />
        )}
      </div>

      <div className="border-t border-content-border p-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onClose}
          disabled={saving}
          className="h-7 w-full"
          data-ai-component={`${aiBase}.close`}
          data-ai-action={`${aiBase}.close.click`}
          data-ai-role="jump"
        >
          关闭
        </Button>
      </div>
    </div>
  );
}

function ProgressEditor({
  initialValue,
  onSubmit,
  saving,
}: {
  initialValue: number;
  onSubmit: (value: number) => Promise<void>;
  saving: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <div className="space-y-3">
      <Slider
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex items-center justify-between">
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="w-20 rounded-md border border-content-border bg-content-bg-secondary px-2 py-1 text-sm"
        />
        <Button type="button" size="sm" onClick={() => onSubmit(value)} disabled={saving}>
          Save progress
        </Button>
      </div>
    </div>
  );
}
