import { useNavigate } from 'react-router-dom';
import type { Project } from '../api/project-api';
import { Button } from '@/shared/ui/button';
import { FolderKanban, Plus, Activity, User, Calendar, Target, CheckCircle2 } from 'lucide-react';
import { colors, radii, spacing, typography, shadows } from '@/shared/theme/tokens';

export interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  onCreateClick: () => void;
}

function getHealthLabel(project: Project): string {
  // Simple heuristic: active projects are "On track", archived are "Paused"
  const base = project.status === 'active' ? 'On track' : 'Paused';
  const days =
    Math.max(
      1,
      Math.round(
        (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
      ),
    ) || 1;

  return `${base} · ${days}d`;
}

function getLeadInitials(project: Project): string {
  const lead = project.members?.[0]?.user;
  if (!lead) return 'AG';
  const name = lead.displayName || lead.username;
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ProjectList({ projects, isLoading, onCreateClick }: ProjectListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div
        style={{
          padding: '16px 16px 8px',
          fontSize: '13px',
          color: '#9ca3af',
        }}
      >
        Loading projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: '13px',
          color: '#9ca3af',
        }}
      >
        <div>
          <div style={{ marginBottom: 4 }}>No projects yet</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Create your first project to get started.
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateClick}
          leftIcon={<Plus size={14} />}
        >
          Create project
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '4px 8px 4px',
        fontSize: '13px',
        color: '#e5e7eb',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 2fr) 1.2fr 1fr 1fr 1fr 0.8fr',
          padding: '6px 8px 6px 4px',
          borderBottom: '1px solid #111827',
          textTransform: 'uppercase',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: '#6b7280',
        }}
      >
        <div style={{ paddingLeft: 8 }}>Name</div>
        <div>Health</div>
        <div>Priority</div>
        <div>Lead</div>
        <div>Target date</div>
        <div style={{ textAlign: 'right', paddingRight: 4 }}>Status</div>
      </div>

      {projects.map((project, index) => (
        <div
          key={project.id}
          onClick={() => navigate(`/app/projects/${project.id}`)}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 2fr) 1.2fr 1fr 1fr 1fr 0.8fr',
            padding: `${spacing.md}px ${spacing.md}px ${spacing.md}px ${spacing.xs}px`,
            alignItems: 'center',
            borderBottom:
              index === projects.length - 1 ? 'none' : `1px solid ${colors.borderSubtle}`,
            backgroundColor: 'transparent',
            cursor: 'pointer',
            borderRadius: radii.sm,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.surface;
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          {/* Name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingLeft: 8,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: radii.sm,
                background:
                  'radial-gradient(circle at 0 0, #22c55e 0, #22c55e 35%, #3b82f6 70%, #0f172a 100%)',
                boxShadow: shadows.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderKanban size={14} color="#020617" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: '13px' }}>{project.name}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {project.description || 'Phase 1 · Core & Agent workspace'}
              </div>
            </div>
          </div>

          {/* Health */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                borderRadius: radii.sm,
                padding: `${spacing.xs}px ${spacing.sm}px`,
                backgroundColor: 'rgba(22,163,74,0.15)',
                color: '#bbf7d0',
                fontSize: typography.xs,
                border: `1px solid rgba(34,197,94,0.3)`,
              }}
            >
              <Activity size={12} />
              <span>{getHealthLabel(project)}</span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.xs,
                color: colors.textPrimary,
              }}
            >
              <Target size={14} color="#fbbf24" />
              <span>Medium</span>
            </div>
          </div>

          {/* Lead */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: radii.sm,
                  background:
                    'radial-gradient(circle at 0 0, #6366f1 0, #6366f1 40%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.xs,
                  fontWeight: 600,
                  color: '#020617',
                  boxShadow: shadows.sm,
                }}
              >
                <User size={14} color="#020617" />
              </div>
              <div style={{ fontSize: '12px' }}>
                {project.members?.[0]?.user.displayName ||
                  project.members?.[0]?.user.username ||
                  'Agent Owner'}
              </div>
            </div>
          </div>

          {/* Target date */}
          <div style={{ fontSize: typography.xs, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <Calendar size={14} />
            <span>Feb 28th</span>
          </div>

          {/* Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              paddingRight: 4,
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.xs,
                color: colors.textSecondary,
              }}
            >
              <CheckCircle2 size={14} />
              <span>0%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

