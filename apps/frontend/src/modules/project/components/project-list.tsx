import { useNavigate } from 'react-router-dom';
import type { Project } from '../api/project-api';

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
        <button
          type="button"
          onClick={onCreateClick}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: 'none',
            background: 'linear-gradient(135deg, #22c55e, #22c55e 40%, #a855f7 100%)',
            color: '#020617',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Create project
        </button>
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
            padding: '8px 8px 8px 4px',
            alignItems: 'center',
            borderBottom:
              index === projects.length - 1 ? 'none' : '1px solid rgba(15,23,42,0.8)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
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
                width: 22,
                height: 22,
                borderRadius: 8,
                background:
                  'radial-gradient(circle at 0 0, #22c55e 0, #22c55e 35%, #3b82f6 70%, #0f172a 100%)',
                boxShadow: '0 0 0 1px rgba(15,23,42,0.8)',
              }}
            />
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
                gap: 6,
                borderRadius: 999,
                padding: '3px 8px',
                backgroundColor: 'rgba(22,163,74,0.1)',
                color: '#bbf7d0',
                fontSize: '11px',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '999px',
                  backgroundColor: '#22c55e',
                  boxShadow: '0 0 0 4px rgba(34,197,94,0.2)',
                }}
              />
              <span>{getHealthLabel(project)}</span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '12px',
                color: '#e5e7eb',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '999px',
                  border: '2px solid #fbbf24',
                  boxSizing: 'border-box',
                }}
              />
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
                  width: 22,
                  height: 22,
                  borderRadius: '999px',
                  background:
                    'radial-gradient(circle at 0 0, #6366f1 0, #6366f1 40%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#020617',
                }}
              >
                {getLeadInitials(project)}
              </div>
              <div style={{ fontSize: '12px' }}>
                {project.members?.[0]?.user.displayName ||
                  project.members?.[0]?.user.username ||
                  'Agent Owner'}
              </div>
            </div>
          </div>

          {/* Target date */}
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Feb 28th</div>

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
                width: 18,
                height: 18,
                borderRadius: '999px',
                border: '3px solid #1f2937',
                boxSizing: 'border-box',
              }}
            />
            <span>0%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

