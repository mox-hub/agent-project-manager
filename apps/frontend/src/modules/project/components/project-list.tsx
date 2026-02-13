import type { Project } from '../api/project-api';

export interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  onCreateClick: () => void;
}

export function ProjectList({ projects, isLoading, onCreateClick }: ProjectListProps) {
  if (isLoading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h2 style={{ margin: 0 }}>Projects</h2>
        <button
          type="button"
          onClick={onCreateClick}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            border: '1px dashed #cbd5f5',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            color: '#6b7280',
          }}
        >
          <p style={{ marginBottom: '8px' }}>No projects yet.</p>
          <button
            type="button"
            onClick={onCreateClick}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px',
          }}
        >
          {projects.map((project) => (
            <article
              key={project.id}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '12px',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
              }}
            >
              <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>{project.name}</h3>
              {project.description && (
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '13px',
                    color: '#6b7280',
                  }}
                >
                  {project.description}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '8px',
                  fontSize: '12px',
                }}
              >
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '999px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                  }}
                >
                  {project.type}
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '999px',
                    backgroundColor: '#f3f4f6',
                    color: '#4b5563',
                  }}
                >
                  {project.visibility}
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '999px',
                    backgroundColor:
                      project.status === 'active' ? '#ecfdf3' : '#fef3c7',
                    color: project.status === 'active' ? '#166534' : '#92400e',
                  }}
                >
                  {project.status}
                </span>
              </div>
              {project._count && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  <span style={{ marginRight: '8px' }}>
                    Tasks: {project._count.tasks ?? 0}
                  </span>
                  <span>Iterations: {project._count.iterations ?? 0}</span>
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                Updated:{' '}
                {new Date(project.updatedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

