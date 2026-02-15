import { useState } from 'react';
import { useProjectList } from '../hooks/use-project-list';
import { useCreateProject } from '../hooks/use-project-mutations';
import { ProjectFilterSidebar } from '../components/project-filter-sidebar';
import { ProjectList } from '../components/project-list';
import type { ProjectListParams, ProjectType, ProjectVisibility } from '../api/project-api';
import { useProjectTemplates } from '@/modules/core-config/hooks/use-metadata';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input, Select } from '@/shared/ui/field';
import { FolderKanban, Plus, LayoutGrid, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

export function ProjectListPage() {
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
        color: '#e5e7eb',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderBottom: `1px solid ${colors.borderSubtle}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            fontSize: typography.sm,
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FolderKanban size={14} />}
          >
            Projects
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
          >
            All projects
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
          >
            New view
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          {/* Search input */}
          <Input
            type="search"
            placeholder="Search projects..."
            value={filters.q ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                q: e.target.value || undefined,
                page: 1,
              }))
            }
            leftIcon={<Search size={14} />}
            style={{
              minWidth: '220px',
            }}
          />
          {/* Filter Button */}
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
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: `2px solid ${colors.textMuted}`,
                  boxSizing: 'border-box',
                }}
              />
            }
          >
            Display
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
            leftIcon={<Plus size={14} />}
          >
            Add project
          </Button>
        </div>
      </header>

      {/* Main content area with project list */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: `${spacing.md}px ${spacing.lg}px`,
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
                gap: spacing.sm,
                padding: `${spacing.md}px 0 0`,
                fontSize: typography.xs,
                color: colors.textMuted,
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
        <Card
          title="Create project"
          description="Spin up a new workspace project for your AI agents to work on."
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createProject.isPending}
                form="create-project-form"
              >
                {createProject.isPending ? 'Creating...' : 'Create project'}
              </Button>
            </>
          }
        >
          <form id="create-project-form" onSubmit={handleCreate}>
            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.xs,
                  marginBottom: spacing.xs,
                  color: colors.textPrimary,
                  fontWeight: 500,
                }}
              >
                Name
              </label>
              <Input
                name="name"
                required
                placeholder="Agent Project Manager"
              />
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.xs,
                  marginBottom: spacing.xs,
                  color: colors.textPrimary,
                  fontWeight: 500,
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
                  padding: `${spacing.sm + 2}px ${spacing.lg}px`,
                  borderRadius: radii.md,
                  border: `1px solid ${colors.borderStrong}`,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  fontSize: typography.sm,
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accent}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.borderStrong;
                  e.currentTarget.style.boxShadow = '';
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: spacing.lg,
                marginBottom: spacing.lg,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.xs,
                    marginBottom: spacing.xs,
                    color: colors.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  Type
                </label>
                <Select name="type" defaultValue="team">
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="experiment">Experiment</option>
                  <option value="enterprise">Enterprise</option>
                </Select>
              </div>

              <div style={{ flex: 1, minWidth: '160px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.xs,
                    marginBottom: spacing.xs,
                    color: colors.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  Visibility
                </label>
                <Select name="visibility" defaultValue="internal">
                  <option value="private">Private</option>
                  <option value="internal">Internal</option>
                  <option value="public">Public</option>
                </Select>
              </div>
            </div>

            {templates.length > 0 && (
              <div style={{ marginBottom: spacing.lg }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: typography.xs,
                    marginBottom: spacing.xs,
                    color: colors.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  Template (Optional)
                </label>
                <Select name="templateId">
                  <option value="">None</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </form>
        </Card>
      )}
    </div>
  );
}

