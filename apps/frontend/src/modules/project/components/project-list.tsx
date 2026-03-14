import { useNavigate } from 'react-router-dom';
import type { Project, ProjectType } from '../api/project-api';
import {
  FolderKanban,
  Plus,
  Users,
  Star,
  Rocket,
  LayoutGrid,
  FlaskConical,
  Building2,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  onCreateClick: () => void;
  viewMode?: 'list' | 'grid' | 'chart';
}

function getProjectIcon(type: ProjectType) {
  switch (type) {
    case 'enterprise':
      return Building2;
    case 'team':
      return LayoutGrid;
    case 'experiment':
      return FlaskConical;
    default:
      return Rocket;
  }
}

function getLeadDisplay(project: Project): string {
  const lead = project.members?.[0]?.user;
  if (!lead) return '—';
  return lead.displayName || lead.username || '—';
}

function getLeadInitials(project: Project): string {
  const lead = project.members?.[0]?.user;
  if (!lead) return '?';
  const name = lead.displayName || lead.username;
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatTimeline(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Priority proxy from type (API has no priority): enterprise=high, team/experiment=medium, personal=low */
function getPriorityFromType(type: ProjectType): 'high' | 'medium' | 'low' {
  if (type === 'enterprise') return 'high';
  if (type === 'personal') return 'low';
  return 'medium';
}

/** Label pill colors by type / status */
const TYPE_LABEL_STYLES: Record<ProjectType, string> = {
  team: 'bg-accent-blue/15 text-accent-blue',
  personal: 'bg-content-border text-content-text-secondary',
  experiment: 'bg-accent-purple/15 text-accent-purple',
  enterprise: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

const STATUS_LABEL_STYLES: Record<string, string> = {
  active: 'bg-status-on-track/15 text-status-on-track',
  archived: 'bg-content-border text-content-text-muted',
};

function HealthCell({ project }: { project: Project }) {
  const { theme } = useTheme();
  const score = project.healthScore ?? project.aiContext?.healthScore ?? null;
  const snapshots = project.healthSnapshots ?? [];
  const values = snapshots.length > 0
    ? snapshots.map((s) => s.healthScore).sort((a, b) => a - b)
    : score != null ? [score] : [];

  const displayScore = score ?? (values.length ? values[values.length - 1] : null);
  const color =
    displayScore == null
      ? theme.colors.content.textMuted
      : displayScore >= 80
        ? theme.colors.status.onTrack
        : displayScore >= 50
          ? theme.colors.status.atRisk
          : theme.colors.status.offTrack;

  if (displayScore == null) {
    return <span className="text-content-text-muted">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {values.length > 1 && (
        <svg
          width={48}
          height={20}
          viewBox="0 0 48 20"
          className="shrink-0 overflow-visible"
          aria-hidden
        >
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={values
              .map((v, i) => {
                const x = (i / Math.max(1, values.length - 1)) * 40 + 4;
                const y = 16 - (v / 100) * 12;
                return `${x},${y}`;
              })
              .join(' ')}
          />
        </svg>
      )}
      <span className="text-sm font-medium" style={{ color }}>
        {Math.round(displayScore)}%
      </span>
    </div>
  );
}

/** Table columns: Name, Labels, Health, Teams, Pri., Lead, MBR, Timeline */
const COLUMNS = [
  { key: 'name', label: 'PROJECT NAME', minWidth: 220, flex: 2 },
  { key: 'labels', label: 'LABELS', minWidth: 90, flex: 0.9 },
  { key: 'health', label: 'HEALTH', minWidth: 110, flex: 1 },
  { key: 'teams', label: 'TEAMS', minWidth: 72, flex: 0.7 },
  { key: 'priority', label: 'PRI.', minWidth: 56, flex: 0.6 },
  { key: 'lead', label: 'LEAD', minWidth: 100, flex: 0.9 },
  { key: 'members', label: 'MBR', minWidth: 48, flex: 0.5 },
  { key: 'timeline', label: 'TIMELINE', minWidth: 72, flex: 0.7 },
];

export function ProjectList({
  projects,
  isLoading,
  onCreateClick,
  viewMode = 'list',
}: ProjectListProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { typography, spacing, radii } = theme;

  const projectList = Array.isArray(projects) ? projects : [];

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12 text-content-text-muted"
        style={{ fontSize: typography.fontSize.sm }}
      >
        Loading projects…
      </div>
    );
  }

  if (projectList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div
          className="flex items-center justify-center rounded-lg bg-content-bg-secondary"
          style={{ width: 64, height: 64 }}
        >
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
        >
          <Plus size={14} />
          New project
        </button>
      </div>
    );
  }

  // Grid / Chart view placeholder: render list for now
  const showTable = viewMode === 'list';

  if (!showTable) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-content-text-muted">
        <LayoutGrid size={40} />
        <p className="text-sm">{viewMode === 'grid' ? 'Grid view' : 'Chart view'} coming soon.</p>
        <p className="text-xs">Switch to List view to see projects.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto" style={{ fontSize: typography.fontSize.sm }}>
      {/* Table header - grid fills available width, name column gets extra space */}
      <div
        className="grid w-full border-b border-content-border py-2 text-content-text-muted"
        style={{
          gridTemplateColumns: COLUMNS.map((c) => `minmax(${c.minWidth}px, ${c.flex}fr)`).join(' '),
          gap: spacing.md,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {COLUMNS.map((col) => (
          <div key={col.key} className="min-w-0">
            {col.label}
          </div>
        ))}
      </div>

      {projectList.map((project) => {
        const IconComponent = getProjectIcon(project.type);
        const priority = getPriorityFromType(project.type);
        const members = project.members ?? [];
        const lead = members[0]?.user;

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
            className="grid w-full cursor-pointer items-center border-b border-content-border-light bg-transparent py-3 transition-colors hover:bg-content-bg-secondary min-w-0"
            style={{
              gridTemplateColumns: COLUMNS.map((c) => `minmax(${c.minWidth}px, ${c.flex}fr)`).join(' '),
              gap: spacing.md,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
            }}
          >
            {/* PROJECT NAME: icon + star + name */}
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-content-bg-secondary text-content-text-muted"
                style={{ borderRadius: radii.sm }}
              >
                <IconComponent size={16} />
              </div>
              <Star
                size={14}
                className="shrink-0 text-amber-500 fill-amber-500"
                aria-hidden
              />
              <span
                className="min-w-0 truncate font-medium text-content-text"
                title={project.name}
              >
                {project.name}
              </span>
            </div>

            {/* LABELS: type + status pills */}
            <div className="flex flex-wrap gap-1.5">
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium uppercase',
                  TYPE_LABEL_STYLES[project.type],
                )}
              >
                {project.type}
              </span>
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium capitalize',
                  STATUS_LABEL_STYLES[project.status] ?? 'bg-content-bg-secondary text-content-text-muted',
                )}
              >
                {project.status}
              </span>
            </div>

            {/* HEALTH */}
            <div className="min-w-0">
              <HealthCell project={project} />
            </div>

            {/* TEAMS: member avatars */}
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m) => (
                <Avatar
                  key={m.user.id}
                  className="h-7 w-7 border-2 border-content-border ring-0"
                  title={m.user.displayName || m.user.username}
                >
                  {m.user.avatarUrl ? (
                    <AvatarImage src={m.user.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-[10px] bg-accent-blue">
                    {(m.user.displayName || m.user.username)
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            {/* PRI. (from type) */}
            <div className="flex items-center gap-1 text-content-text-muted">
              {priority === 'high' && <ArrowUp size={14} />}
              {priority === 'medium' && <Minus size={14} />}
              {priority === 'low' && <ArrowDown size={14} />}
              <span className="capitalize text-content-text-secondary">{priority}</span>
            </div>

            {/* LEAD */}
            <div className="flex min-w-0 items-center gap-2">
              {lead ? (
                <>
                  <Avatar className="h-6 w-6 shrink-0">
                    {lead.avatarUrl ? (
                      <AvatarImage src={lead.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[10px] bg-accent-purple">
                      {getLeadInitials(project)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-content-text">
                    {getLeadDisplay(project)}
                  </span>
                </>
              ) : (
                <span className="text-content-text-muted">—</span>
              )}
            </div>

            {/* MBR */}
            <div className="flex items-center gap-1.5 text-content-text-muted">
              <Users size={14} className="shrink-0" />
              <span>{members.length}</span>
            </div>

            {/* TIMELINE (updatedAt) */}
            <div className="text-content-text-secondary">
              {formatTimeline(project.updatedAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
