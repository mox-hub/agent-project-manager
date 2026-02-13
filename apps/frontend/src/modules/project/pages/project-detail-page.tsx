import { Link, useParams } from 'react-router-dom';
import { useProjectDetail } from '../hooks/use-project-detail';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error } = useProjectDetail(projectId);

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading project...</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <h2 style={{ margin: '0 0 12px', fontSize: '20px', color: '#dc2626' }}>
          Failed to load project
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#6b7280' }}>
          {error instanceof Error
            ? error.message
            : 'The project could not be loaded. It may not exist or you may not have permission to view it.'}
        </p>
        <Link
          to="/app"
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            color: '#374151',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav style={{ fontSize: '13px', marginBottom: '8px', color: '#6b7280' }}>
        <Link to="/app" style={{ color: '#2563eb', textDecoration: 'none' }}>
          Projects
        </Link>
        <span> / </span>
        <span>{project.name}</span>
      </nav>

      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 8px' }}>{project.name}</h1>
        {project.description && (
          <p
            style={{
              margin: 0,
              maxWidth: '640px',
              fontSize: '14px',
              color: '#4b5563',
            }}
          >
            {project.description}
          </p>
        )}
      </header>

      <section
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px',
          fontSize: '12px',
        }}
      >
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '999px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
          }}
        >
          {project.type}
        </span>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '999px',
            backgroundColor: '#f3f4f6',
            color: '#4b5563',
          }}
        >
          {project.visibility}
        </span>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '999px',
            backgroundColor:
              project.status === 'active' ? '#ecfdf3' : '#fef3c7',
            color: project.status === 'active' ? '#166534' : '#92400e',
          }}
        >
          {project.status}
        </span>
      </section>

      <section
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '24px',
          fontSize: '12px',
        }}
      >
        {project._count && (
          <>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ color: '#6b7280', marginBottom: '4px' }}>Tasks</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {project._count.tasks ?? 0}
              </div>
            </div>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ color: '#6b7280', marginBottom: '4px' }}>
                Iterations
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {project._count.iterations ?? 0}
              </div>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 style={{ margin: '0 0 8px', fontSize: '16px' }}>Work</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link
            to={`/app/projects/${project.id}/tasks`}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #2563eb',
              backgroundColor: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            Open Task Board
          </Link>
        </div>
      </section>
    </div>
  );
}

