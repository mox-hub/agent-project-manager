import { useState } from 'react';
import { useProjectList } from '../hooks/use-project-list';
import { useCreateProject } from '../hooks/use-project-mutations';
import { ProjectFilterBar } from '../components/project-filter-bar';
import { ProjectList } from '../components/project-list';
import type { ProjectListParams, ProjectType, ProjectVisibility } from '../api/project-api';

export function ProjectListPage() {
  const [filters, setFilters] = useState<ProjectListParams>({ status: 'active' });
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useProjectList(filters);
  const createProject = useCreateProject();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    if (!name) return;

    const description = String(formData.get('description') ?? '').trim() || undefined;
    const type = (formData.get('type') as ProjectType) || 'team';
    const visibility = (formData.get('visibility') as ProjectVisibility) || 'internal';

    createProject.mutate(
      {
        name,
        description,
        type,
        visibility,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          event.currentTarget.reset();
        },
      } as any,
    );
  };

  return (
    <div>
      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: 0, marginBottom: '4px' }}>Projects</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
          Manage the projects this AI agent works on.
        </p>
      </header>

      <ProjectFilterBar
        initialFilters={filters}
        onChange={(next) => setFilters(next)}
      />

      <ProjectList
        projects={data?.data ?? []}
        isLoading={isLoading}
        onCreateClick={() => setShowCreate(true)}
      />

      {showCreate && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
            maxWidth: '480px',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Create project</h3>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>
                Name
              </label>
              <input
                name="name"
                required
                placeholder="Agent Project Manager"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Short description of this project"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: '160px' }}>
                <label
                  style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}
                >
                  Type
                </label>
                <select
                  name="type"
                  defaultValue="team"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                  }}
                >
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="experiment">Experiment</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div style={{ minWidth: '160px' }}>
                <label
                  style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}
                >
                  Visibility
                </label>
                <select
                  name="visibility"
                  defaultValue="internal"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                  }}
                >
                  <option value="private">Private</option>
                  <option value="internal">Internal</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProject.isPending}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  cursor: 'pointer',
                  opacity: createProject.isPending ? 0.7 : 1,
                }}
              >
                {createProject.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

