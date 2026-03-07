import { useState } from 'react';
import { useProjectList } from '../hooks/use-project-list';
import { useCreateProject } from '../hooks/use-project-mutations';
import { ProjectFilterSidebar } from '../components/project-filter-sidebar';
import { ProjectList } from '../components/project-list';
import type { ProjectListParams, ProjectType, ProjectVisibility } from '../api/project-api';
import { useProjectTemplates } from '@/modules/core-config/hooks/use-metadata';
import { Button } from '@/shared/ui/button';
import { Plus, ChevronLeft, ChevronRight, Search, Columns } from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';

export function ProjectListPage() {
  const { theme } = useTheme();
  const { colors, typography, spacing, radii } = theme;
  const [filters, setFilters] = useState<ProjectListParams>({
    status: 'active',
    page: 1,
    pageSize: 20,
  });
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useProjectList(filters);
  const createProject = useCreateProject();
  const { data: templates = [] } = useProjectTemplates();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    if (!name) return;

    const description = String(formData.get('description') ?? '').trim() || undefined;
    const type = (formData.get('type') as ProjectType) || 'team';
    const visibility = (formData.get('visibility') as ProjectVisibility) || 'internal';
    const templateId = String(formData.get('templateId') ?? '').trim() || undefined;

    createProject.mutate(
      {
        name,
        description,
        type,
        visibility,
        templateId,
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
  const meta = data?.meta;
  const currentPage = meta?.page ?? filters.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage === currentPage) return;
    setFilters((prev) => ({
      ...prev,
      page: nextPage,
    }));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: colors.content.text,
        overflow: 'hidden',
        backgroundColor: colors.content.bg,
      }}
    >
      {/* Linear-style page header: title + view tabs + actions */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing['2xl']}px ${spacing['3xl']}px ${spacing.lg}px`,
          borderBottom: `1px solid ${colors.content.border}`,
          flexShrink: 0,
          backgroundColor: colors.content.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xl }}>
          <h1
            style={{
              margin: 0,
              fontSize: typography.fontSize.title,
              fontWeight: typography.fontWeight.semibold,
              color: colors.content.text,
            }}
          >
            Projects
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${colors.content.border}`,
              borderRadius: radii.md,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              style={{
                padding: `${spacing.sm}px ${spacing.lg}px`,
                border: 'none',
                background: colors.content.bgSecondary,
                color: colors.content.text,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                borderRight: `1px solid ${colors.content.border}`,
              }}
            >
              All projects
            </button>
            <button
              type="button"
              style={{
                padding: `${spacing.sm}px ${spacing.lg}px`,
                border: 'none',
                background: 'transparent',
                color: colors.content.textMuted,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              + New view
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: spacing.md,
                color: colors.content.textMuted,
                pointerEvents: 'none',
              }}
            />
            <input
              type="search"
              placeholder="Search"
              value={filters.q ?? ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  q: e.target.value || undefined,
                  page: 1,
                }))
              }
              style={{
                padding: `${spacing.sm}px ${spacing.md}px ${spacing.sm}px ${spacing['2xl'] + 4}px`,
                borderRadius: radii.md,
                border: `1px solid ${colors.content.border}`,
                backgroundColor: colors.content.bg,
                color: colors.content.text,
                fontSize: typography.fontSize.sm,
                width: 180,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.content.textMuted;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.content.border;
              }}
            />
          </div>
          <ProjectFilterSidebar
            filters={filters}
            onChange={(next) =>
              setFilters((prev) => ({
                ...prev,
                ...next,
                page: 1,
              }))
            }
          />
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.sm}px ${spacing.md}px`,
              border: `1px solid ${colors.content.border}`,
              borderRadius: radii.md,
              background: colors.content.bg,
              color: colors.content.textSecondary,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
            }}
          >
            <Columns size={14} />
            Display
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.sm}px ${spacing.lg}px`,
              border: 'none',
              borderRadius: radii.md,
              background: colors.content.text,
              color: colors.content.bg,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            New project
          </button>
        </div>
      </header>

      {/* Table area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: `0 ${spacing['3xl']}px ${spacing['2xl']}px`,
        }}
      >
        <ProjectList
          projects={projects}
          isLoading={isLoading}
          onCreateClick={() => setShowCreate(true)}
        />

        {meta && totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: spacing.md,
              padding: `${spacing.lg}px 0 0`,
              fontSize: typography.fontSize.xs,
              color: colors.content.textMuted,
              flexShrink: 0,
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              leftIcon={<ChevronLeft size={14} />}
            >
              Prev
            </Button>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              rightIcon={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              backgroundColor: colors.content.bg,
              borderRadius: radii.lg,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflow: 'auto',
              border: `1px solid ${colors.content.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: `${spacing['2xl']}px ${spacing['2xl']}px ${spacing.lg}px`,
                borderBottom: `1px solid ${colors.content.border}`,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.content.text,
                }}
              >
                Create project
              </h2>
              <p
                style={{
                  margin: `${spacing.sm}px 0 0`,
                  fontSize: typography.fontSize.sm,
                  color: colors.content.textSecondary,
                }}
              >
                Spin up a new workspace project for your AI agents to work on.
              </p>
            </div>
            <form id="create-project-form" onSubmit={handleCreate}>
              <div style={{ padding: spacing['2xl'] }}>
                <div style={{ marginBottom: spacing['2xl'] }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      marginBottom: spacing.sm,
                      color: colors.content.text,
                      fontWeight: typography.fontWeight.medium,
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
                      padding: `${spacing.sm + 2}px ${spacing.md}px`,
                      borderRadius: radii.md,
                      border: `1px solid ${colors.content.border}`,
                      backgroundColor: colors.content.bgSecondary,
                      color: colors.content.text,
                      fontSize: typography.fontSize.md,
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.content.text;
                      e.currentTarget.style.backgroundColor = colors.content.bg;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.content.border;
                      e.currentTarget.style.backgroundColor = colors.content.bgSecondary;
                    }}
                  />
                </div>

                <div style={{ marginBottom: spacing['2xl'] }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      marginBottom: spacing.sm,
                      color: colors.content.text,
                      fontWeight: typography.fontWeight.medium,
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
                      padding: `${spacing.sm + 2}px ${spacing.md}px`,
                      borderRadius: radii.md,
                      border: `1px solid ${colors.content.border}`,
                      backgroundColor: colors.content.bgSecondary,
                      color: colors.content.text,
                      fontSize: typography.fontSize.md,
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.content.text;
                      e.currentTarget.style.backgroundColor = colors.content.bg;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.content.border;
                      e.currentTarget.style.backgroundColor = colors.content.bgSecondary;
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: spacing['2xl'] - 4,
                    marginBottom: spacing['2xl'],
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        marginBottom: spacing.sm,
                        color: colors.content.text,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      Type
                    </label>
                    <select
                      name="type"
                      defaultValue="team"
                      style={{
                        width: '100%',
                        padding: `${spacing.sm + 2}px ${spacing.md}px`,
                        borderRadius: radii.md,
                        border: `1px solid ${colors.content.border}`,
                        backgroundColor: colors.content.bgSecondary,
                        color: colors.content.text,
                        fontSize: typography.fontSize.md,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="personal">Personal</option>
                      <option value="team">Team</option>
                      <option value="experiment">Experiment</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        marginBottom: spacing.sm,
                        color: colors.content.text,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      Visibility
                    </label>
                    <select
                      name="visibility"
                      defaultValue="internal"
                      style={{
                        width: '100%',
                        padding: `${spacing.sm + 2}px ${spacing.md}px`,
                        borderRadius: radii.md,
                        border: `1px solid ${colors.content.border}`,
                        backgroundColor: colors.content.bgSecondary,
                        color: colors.content.text,
                        fontSize: typography.fontSize.md,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="private">Private</option>
                      <option value="internal">Internal</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                {templates.length > 0 && (
                  <div style={{ marginBottom: spacing.lg }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        marginBottom: spacing.sm,
                        color: colors.content.text,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      Template (Optional)
                    </label>
                    <select
                      name="templateId"
                      style={{
                        width: '100%',
                        padding: `${spacing.sm + 2}px ${spacing.md}px`,
                        borderRadius: radii.md,
                        border: `1px solid ${colors.content.border}`,
                        backgroundColor: colors.content.bgSecondary,
                        color: colors.content.text,
                        fontSize: typography.fontSize.md,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">None</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTop: `1px solid ${colors.content.border}`,
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  style={{
                    border: `1px solid ${colors.content.border}`,
                    color: colors.content.text,
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createProject.isPending}
                  form="create-project-form"
                  style={{
                    backgroundColor: colors.content.text,
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  {createProject.isPending ? 'Creating...' : 'Create project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

