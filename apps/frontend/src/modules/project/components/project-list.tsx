import { useMemo, useState, useRef, useCallback, type MouseEvent, type ReactNode } from 'react';
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
  Search,
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
  low: { icon: 'text-accent-blue', text: 'text-accent-blue', ring: 'bg-accent-blue-light ring-accent-blue/30' },
  medium: { icon: 'text-accent-purple', text: 'text-accent-purple', ring: 'bg-accent-purple-light ring-accent-purple/30' },
  high: { icon: 'text-accent-yellow', text: 'text-accent-yellow', ring: 'bg-accent-yellow-light ring-accent-yellow/30' },
  urgent: { icon: 'text-accent-red', text: 'text-accent-red', ring: 'bg-accent-red-light ring-accent-red/30' },
};

const HEALTH_STYLE: Record<ProjectHealthStatus, { icon: string; text: string; ring: string; dot: string }> = {
  on_track: { icon: 'text-accent-green', text: 'text-accent-green', ring: 'bg-accent-green-light ring-accent-green/30', dot: 'bg-accent-green' },
  at_risk: { icon: 'text-accent-yellow', text: 'text-accent-yellow', ring: 'bg-accent-yellow-light ring-accent-yellow/30', dot: 'bg-accent-yellow' },
  off_track: { icon: 'text-accent-red', text: 'text-accent-red', ring: 'bg-accent-red-light ring-accent-red/30', dot: 'bg-accent-red' },
};

const WORKFLOW_STYLE: Record<ProjectWorkflowStatus, string> = {
  backlog: 'bg-muted/50 text-muted-foreground',
  planned: 'bg-accent-purple-light text-accent-purple',
  in_progress: 'bg-accent-blue-light text-accent-blue',
  completed: 'bg-accent-green-light text-accent-green',
  canceled: 'bg-muted/50 text-muted-foreground',
};

const WORKFLOW_ICON_STYLE: Record<ProjectWorkflowStatus, string> = {
  backlog: 'text-muted-foreground',
  planned: 'text-accent-purple',
  in_progress: 'text-accent-blue',
  completed: 'text-accent-green',
  canceled: 'text-muted-foreground',
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
  { key: 'start', label: 'Start', minWidth: 120, flex: 0.8 },
  { key: 'target', label: 'Target', minWidth: 120, flex: 0.8 },
  { key: 'progress', label: 'Progress', minWidth: 140, flex: 1 },
  { key: 'updated', label: 'Updated', minWidth: 120, flex: 0.9 },
  { key: 'status', label: 'Status', minWidth: 120, flex: 1 },
] as const;

export type ProjectListColumnKey = (typeof COLUMNS)[number]['key'];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
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
      className="inline-flex min-h-7 items-center gap-1.5 rounded px-1.5 text-left text-sm transition-colors hover:bg-muted/50"
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

  // 列宽状态
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const getColumnWidth = (col: { key: string; minWidth: number }) => {
    return columnWidths[col.key] ?? col.minWidth;
  };

  const handleColumnResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const currentWidth = columnWidths[key] ?? COLUMNS.find(c => c.key === key)?.minWidth ?? 100;
    setResizing({ key, startX, startWidth: currentWidth });

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(COLUMNS.find(c => c.key === key)?.minWidth ?? 60, currentWidth + delta);
      setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

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
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (projectList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted/50">
          <FolderKanban size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-foreground">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
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
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        Switch to list view for inline editing.
      </div>
    );
  }

  return (
    <div className={cn('w-full min-w-0 overflow-x-auto text-sm', resizing && 'select-none')}>
      <div
        ref={headerRef}
        className="relative grid w-full border-b border-border px-2 py-2 text-xs font-medium uppercase tracking-[0.03em] text-muted-foreground"
        style={{
          gridTemplateColumns: `${visibleColumnDefs.map((c) => `${getColumnWidth(c)}px`).join(' ')} 36px`,
        }}
      >
        {visibleColumnDefs.map((col) => (
          <div key={col.key} className="group relative flex items-center">
            <span className="truncate">{col.label}</span>
            {/* 拖拽调整列宽 */}
            <div
              className={cn(
                'absolute -right-1 top-0 h-full w-2 cursor-col-resize opacity-0 group-hover:opacity-100',
                resizing?.key === col.key && 'opacity-100 bg-accent-blue/50'
              )}
              onMouseDown={(e) => handleColumnResizeStart(col.key, e)}
            />
          </div>
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
            className="group relative grid w-full items-center border-b border-border/40 px-2 py-2 transition-colors hover:bg-muted/50/50"
            style={{
              gridTemplateColumns: `${visibleColumnDefs.map((c) => `${getColumnWidth(c)}px`).join(' ')} 36px`,
            }}
            data-ai-component={`project.project-list.row.${project.id}`}
            data-ai-role="content"
          >
            {visibleColumnDefs.map((col) => {
              if (col.key === 'name') {
                return (
                  <div key={col.key} className="relative min-w-0 pr-14">
                    <span className="block truncate font-medium text-foreground">{project.name}</span>
                    <span className="absolute right-0 top-0 rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-xs leading-none uppercase text-muted-foreground">
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
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', HEALTH_STYLE[healthStatus].ring, HEALTH_STYLE[healthStatus].text)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', HEALTH_STYLE[healthStatus].dot)} />
                      {project.healthScore ?? '—'}
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
                          <AvatarFallback className="text-xs">
                            {(owner.displayName || owner.username).slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{owner.displayName || owner.username}</span>
                      </>
                    ) : (
                      <>
                        <UserRound size={14} className="text-muted-foreground" />
                        <span className="text-muted-foreground">Unassigned</span>
                      </>
                    )}
                  </CellButton>
                );
              }
              if (col.key === 'members') {
                const maxVisible = 3;
                const overflow = members.length - maxVisible;
                return (
                  <div key={col.key} className="flex -space-x-2">
                    {members.slice(0, maxVisible).map((member) => (
                      <Avatar key={member.user.id} className="h-6 w-6 border-2 border-background" title={member.user.displayName || member.user.username}>
                        {member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-xs">
                          {(member.user.displayName || member.user.username).slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {overflow > 0 && (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
                        +{overflow}
                      </span>
                    )}
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
                    <Calendar size={14} className="text-muted-foreground" />
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
                    <Calendar size={14} className="text-muted-foreground" />
                    <span>{formatDate(project.targetDate)}</span>
                  </CellButton>
                );
              }
              if (col.key === 'progress') {
                const taskCount = project._count?.tasks;
                return (
                  <CellButton
                    key={col.key}
                    onClick={(event) => openEditor(event, project.id, 'progress')}
                    aiComponent={`project.project-list.row.${project.id}.progress`}
                    aiAction={`project.project-list.row.${project.id}.progress.edit`}
                  >
                    <div className="h-1.5 w-16 rounded bg-muted/50">
                      <div className="h-1.5 rounded bg-accent-blue" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="tabular-nums text-muted-foreground">{progress}%</span>
                    {taskCount != null && (
                      <span className="text-xs text-muted-foreground">{Math.round(taskCount * progress / 100)}/{taskCount}</span>
                    )}
                  </CellButton>
                );
              }
              if (col.key === 'updated') {
                return <div key={col.key} className="text-muted-foreground">{formatDate(rowUpdatedAt)}</div>;
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
                    className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left text-accent-red hover:bg-accent-red-light hover:text-accent-red`}
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
        className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
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
  const width = editing.field === 'ownerId' ? 240 : 220;
  const estimatedHeight = editing.field === 'ownerId' ? 320 : editing.field === 'progress' ? 180 : 280;

  // 默认显示在触发按钮正下方
  let left = editing.anchorRect.left;
  // 如果右侧空间不够，往左偏移
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }

  // 先尝试显示在正下方
  let top = editing.anchorRect.bottom + 4;
  // 如果下方空间不够，显示在上方
  if (top + estimatedHeight > window.innerHeight - 8) {
    top = editing.anchorRect.top - estimatedHeight - 4;
  }
  // 确保不超出顶部
  if (top < 8) {
    top = 8;
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
      className="fixed z-50 overflow-hidden rounded-lg border border-border bg-popover p-1.5 shadow-lg"
      style={{ width, left, top }}
      onClick={(event) => event.stopPropagation()}
      data-ai-component={aiBase}
      data-ai-role="panel"
    >
      {/* 搜索框 */}
      <div className="mb-1.5 px-1">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={`Change ${editing.field.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
            className="h-7 pl-7 text-xs"
            autoFocus
            data-ai-component={`${aiBase}.search`}
            data-ai-action={`${aiBase}.search.change`}
          />
        </div>
      </div>

      {error && (
        <div className="mx-1 mb-1.5 rounded border border-accent-red/30 bg-accent-red-light px-2 py-1 text-xs text-accent-red">
          {error}
        </div>
      )}

      {/* 选项列表 */}
      <div className="max-h-[200px] overflow-y-auto">
        {editing.field === 'priority' && (
          <div className="space-y-0.5">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => onPatch(project.id, { priority: option.value })}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                  project.priority === option.value ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
                )}
              >
                <span className={cn('inline-flex h-4 w-4 items-center justify-center rounded-full ring-1', PRIORITY_STYLE[option.value].ring)}>
                  {getPriorityIcon(option.value)}
                </span>
                <span className={project.priority === option.value ? '' : PRIORITY_STYLE[option.value].text}>{option.label}</span>
              </button>
            ))}
          </div>
        )}

        {editing.field === 'workflowStatus' && (
          <div className="space-y-0.5">
            {workflowOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => onPatch(project.id, { workflowStatus: option.value })}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                  project.workflowStatus === option.value ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
                )}
              >
                {getWorkflowIcon(option.value)}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}

        {editing.field === 'healthStatus' && (
          <div className="space-y-0.5">
            {healthOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => onPatch(project.id, { healthStatus: option.value })}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                  project.healthStatus === option.value ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
                )}
              >
                {getHealthIcon(option.value)}
                <span className={project.healthStatus === option.value ? '' : HEALTH_STYLE[option.value].text}>{option.label}</span>
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
          className="w-20 rounded-md border border-border bg-muted/50 px-2 py-1 text-sm"
        />
        <Button type="button" size="sm" onClick={() => onSubmit(value)} disabled={saving}>
          Save progress
        </Button>
      </div>
    </div>
  );
}
