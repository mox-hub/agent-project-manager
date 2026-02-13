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
      },
    );
  };

  const projects = data?.data ?? [];

  return (
    <div
      style={{
        padding: '0 16px 8px',
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 8px',
          borderBottom: '1px solid #111827',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '13px',
          }}
        >
          <button
            type="button"
            style={{
              border: 'none',
              background: 'transparent',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '13px',
              color: '#f9fafb',
              cursor: 'pointer',
              backgroundColor: '#111827',
            }}
          >
            Projects
          </button>
          <button
            type="button"
            style={{
              border: 'none',
              background: 'transparent',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '13px',
              color: '#9ca3af',
              cursor: 'default',
            }}
          >
            All projects
          </button>
          <button
            type="button"
            style={{
              border: 'none',
              background: 'transparent',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '13px',
              color: '#9ca3af',
              cursor: 'default',
            }}
          >
            New view
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              border: '1px solid #1f2937',
              backgroundColor: '#020617',
              color: '#e5e7eb',
              fontSize: '12px',
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '999px',
                border: '2px solid #4b5563',
                boxSizing: 'border-box',
              }}
            />
            <span>Display</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e, #a855f7)',
              color: '#0b1120',
              fontSize: '13px',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            + Add project
          </button>
        </div>
      </header>

      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px 8px',
          borderBottom: '1px solid #111827',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '12px', color: '#6b7280' }}>Filter</div>
        <div style={{ flex: 1, minWidth: 260, display: 'flex', justifyContent: 'flex-end' }}>
          <ProjectFilterBar
            initialFilters={filters}
            onChange={(next) => setFilters(next)}
          />
        </div>
      </section>

      <ProjectList
        projects={projects}
        isLoading={isLoading}
        onCreateClick={() => setShowCreate(true)}
      />

      {showCreate && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #1f2937',
            background: '#020617',
            maxWidth: '520px',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: '14px' }}>Create project</h3>
          <p
            style={{
              marginTop: 0,
              marginBottom: 12,
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            Spin up a new workspace project for your AI agents to work on.
          </p>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  marginBottom: '4px',
                  color: '#d1d5db',
                }}
              >
                Name
              </label>
              <input
                name="name"
                required
                placeholder="Agent Project Manager"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #1f2937',
                  backgroundColor: '#020617',
                  color: '#e5e7eb',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  marginBottom: '4px',
                  color: '#d1d5db',
                }}
              >
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Short description of this project"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #1f2937',
                  backgroundColor: '#020617',
                  color: '#e5e7eb',
                  fontSize: '13px',
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
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    marginBottom: '4px',
                    color: '#d1d5db',
                  }}
                >
                  Type
                </label>
                <select
                  name="type"
                  defaultValue="team"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #1f2937',
                    backgroundColor: '#020617',
                    color: '#e5e7eb',
                    fontSize: '13px',
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
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    marginBottom: '4px',
                    color: '#d1d5db',
                  }}
                >
                  Visibility
                </label>
                <select
                  name="visibility"
                  defaultValue="internal"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #1f2937',
                    backgroundColor: '#020617',
                    color: '#e5e7eb',
                    fontSize: '13px',
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
                  borderRadius: '999px',
                  border: '1px solid #1f2937',
                  background: '#020617',
                  cursor: 'pointer',
                  color: '#e5e7eb',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProject.isPending}
                style={{
                  padding: '6px 16px',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #22c55e 40%, #a855f7 100%)',
                  color: '#020617',
                  cursor: 'pointer',
                  opacity: createProject.isPending ? 0.7 : 1,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {createProject.isPending ? 'Creating...' : 'Create project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

