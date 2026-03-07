import { useNavigate } from 'react-router-dom';
import type { Project } from '../api/project-api';
import {
  FolderKanban,
  Plus,
  Activity,
  Calendar,
  BarChart3,
  Users,
  Star,
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';

export interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  onCreateClick: () => void;
}

function getHealthLabel(project: Project): string {
  const base = project.status === 'active' ? 'On track' : 'Paused';
  const days = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  if (days >= 7) {
    const w = Math.floor(days / 7);
    return `${base} · ${w}w`;
  }
  return `${base} · ${days}d`;
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

function formatDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Table columns */
const COLUMNS = [
  { key: 'name', label: 'Name', minWidth: 220, flex: 2 },
  { key: 'labels', label: 'Labels', minWidth: 80, flex: 0.8 },
  { key: 'health', label: 'Health', minWidth: 100, flex: 0.9 },
  { key: 'teams', label: 'Teams', minWidth: 80, flex: 0.8 },
  { key: 'priority', label: 'Priority', minWidth: 72, flex: 0.7 },
  { key: 'lead', label: 'Lead', minWidth: 100, flex: 0.9 },
  { key: 'members', label: 'Members', minWidth: 64, flex: 0.6 },
  { key: 'startDate', label: 'Start date', minWidth: 88, flex: 0.8 },
  { key: 'targetDate', label: 'Target date', minWidth: 96, flex: 0.8 },
  { key: 'created', label: 'Created', minWidth: 72, flex: 0.7 },
];

export function ProjectList({ projects, isLoading, onCreateClick }: ProjectListProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { colors, typography, spacing, radii } = theme;

  if (isLoading) {
    return (
      <div
        style={{
          padding: spacing['3xl'],
          fontSize: typography.fontSize.sm,
          color: colors.content.textSecondary,
        }}
      >
        Loading projects…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        style={{
          padding: spacing['3xl'] * 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xl,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: radii.lg,
            backgroundColor: colors.content.bgSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FolderKanban size={28} color={colors.content.textMuted} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.medium,
              color: colors.content.text,
              marginBottom: spacing.xs,
            }}
          >
            No projects yet
          </div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.content.textSecondary,
            }}
          >
            Create your first project to get started.
          </div>
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm}px ${spacing.lg}px`,
            border: 'none',
            borderRadius: radii.md,
            background: colors.interactive.primary,
            color: colors.interactive.primaryHover,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          New project
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        fontSize: typography.fontSize.sm,
        color: colors.content.text,
      }}
    >
      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS.map((c) => `minmax(${c.minWidth}px, ${c.flex}fr)`).join(' '),
          gap: spacing.md,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderBottom: `1px solid ${colors.content.border}`,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
          color: colors.content.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {COLUMNS.map((col) => (
          <div key={col.key} style={{ minWidth: 0 }}>
            {col.label}
          </div>
        ))}
      </div>

      {projects.map((project) => (
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
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS.map((c) => `minmax(${c.minWidth}px, ${c.flex}fr)`).join(' '),
            gap: spacing.md,
            padding: `${spacing.md}px`,
            alignItems: 'center',
            borderBottom: `1px solid ${colors.content.borderLight}`,
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
            minWidth: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.content.bgSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {/* Name: icon + title + subtitle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: radii.sm,
                backgroundColor: colors.content.bgSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: colors.content.textSecondary,
              }}
            >
              <Star size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: typography.fontWeight.medium,
                  color: colors.content.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {project.name}
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.content.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {project.description || 'No description'}
              </div>
            </div>
          </div>

          {/* Labels */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
            <span
              style={{
                padding: `2px ${spacing.sm}px`,
                borderRadius: radii.sm,
                fontSize: typography.fontSize.xs,
                backgroundColor: colors.content.bgSecondary,
                color: colors.content.textSecondary,
              }}
            >
              {project.type}
            </span>
          </div>

          {/* Health */}
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.status.onTrack,
                fontWeight: typography.fontWeight.medium,
              }}
            >
              <Activity size={14} style={{ flexShrink: 0 }} />
              {getHealthLabel(project)}
            </span>
          </div>

          {/* Teams */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              color: colors.content.textSecondary,
              fontSize: typography.fontSize.sm,
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: '#0ea5e9', flexShrink: 0 }} />
            MOX
          </div>

          {/* Priority */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              color: colors.content.textSecondary,
            }}
          >
            <BarChart3 size={14} />
            <span style={{ fontSize: typography.fontSize.sm }}>Medium</span>
          </div>

          {/* Lead */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ec4899, #db2777)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: '#fff',
                flexShrink: 0,
              }}
              title={getLeadDisplay(project)}
            >
              {getLeadInitials(project)}
            </div>
            <span
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.content.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getLeadDisplay(project)}
            </span>
          </div>

          {/* Members */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              color: colors.content.textMuted,
            }}
          >
            <Users size={14} />
            <span style={{ fontSize: typography.fontSize.sm }}>
              {project.members?.length ?? 0}
            </span>
          </div>

          {/* Start date */}
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.content.textSecondary,
            }}
          >
            —
          </div>

          {/* Target date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              fontSize: typography.fontSize.sm,
              color: colors.content.textSecondary,
            }}
          >
            <Calendar size={14} style={{ flexShrink: 0 }} />
            Feb 28th
          </div>

          {/* Created */}
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.content.textSecondary,
            }}
          >
            {formatDate(project.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
