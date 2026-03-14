import { useState } from 'react';
import { useProjectList } from '../hooks/use-project-list';
import { useCreateProject } from '../hooks/use-project-mutations';
import { useProjectFilterOptions } from '../hooks/use-project-filter-options';
import { ProjectList } from '../components/project-list';
import { ProjectBoard } from '../components/project-board';
import type { ProjectListParams, ProjectType, ProjectVisibility } from '../api/project-api';
import { useProjectTemplates } from '@/modules/core-config/hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ViewSwitcher, type ViewMode } from '@/components/view-switcher';
import { FilterToolbar } from '@/shared/ui/filter-toolbar';
import { buildFilterStateFromQuery, buildQueryFromFilterState } from '@/shared/filters/adapters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';

const PROJECT_FILTER_KEYS = ['status', 'type', 'memberId'] as const;

export function ProjectListPage() {
  const [filters, setFilters] = useState<ProjectListParams>({
    filters: {
      status: ['active'],
    },
    page: 1,
    pageSize: 20,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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
  const projectFilterGroups = useProjectFilterOptions({ projects });
  const meta = data?.meta;
  const currentPage = meta?.page ?? filters.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? projects.length;
  const pageSize = meta?.pageSize ?? filters.pageSize ?? 20;
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage === currentPage) return;
    setFilters((prev) => ({
      ...prev,
      page: nextPage,
    }));
  };

  const pageNumbers: (number | 'ellipsis')[] = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (currentPage > 3) pages.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);
    return pages.filter((p, i, arr) => p !== 'ellipsis' || arr[i - 1] !== 'ellipsis');
  })();

  return (
    <PageShell className="overflow-hidden">
      {/* Page header: title, description, view toggles, Export, New Project */}
      <PageHeader
        title="Project Workspace"
        description="Central hub for tracking all cross-functional initiatives and deliverables."
        actions={(
          <>
            <ViewSwitcher value={viewMode} onValueChange={setViewMode} />
            <Button variant="secondary" size="sm">
              <Download size={14} />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-accent-blue text-white hover:bg-accent-blue/90">
              <Plus size={14} />
              New Project
            </Button>
          </>
        )}
      />

      {/* Search + filters row */}
      <div className="flex flex-wrap items-center gap-3 border-b border-content-border bg-content-bg px-6 py-4">
        <FilterToolbar
          className="flex-1 min-w-[300px]"
          searchValue={filters.q ?? ''}
          searchPlaceholder="Search projects..."
          onSearchChange={(value) => {
            const selectedFilters = buildFilterStateFromQuery(
              filters.filters,
              PROJECT_FILTER_KEYS,
            );
            setFilters(
              buildQueryFromFilterState<NonNullable<ProjectListParams['filters']>>(
                {
                  q: value || undefined,
                  page: 1,
                  pageSize: filters.pageSize,
                },
                selectedFilters,
                PROJECT_FILTER_KEYS,
              ),
            );
          }}
          groups={projectFilterGroups}
          selectedFilters={buildFilterStateFromQuery(filters.filters, PROJECT_FILTER_KEYS)}
          onFilterChange={(filterId, value) => {
            const nextState = {
              ...buildFilterStateFromQuery(filters.filters, PROJECT_FILTER_KEYS),
              [filterId]: value,
            };
            setFilters(
              buildQueryFromFilterState<NonNullable<ProjectListParams['filters']>>(
                {
                  q: filters.q,
                  page: 1,
                  pageSize: filters.pageSize,
                },
                nextState,
                PROJECT_FILTER_KEYS,
              ),
            );
          }}
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Column settings">
          <Settings size={16} />
        </Button>
      </div>

      {/* Table area - full width so list can fill */}
      <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6 w-full min-w-0">
        {viewMode === 'board' ? (
          <ProjectBoard
            projects={projects}
            onProjectClick={(project) => {
              // Navigate to project detail or open a modal
              console.log('Project clicked:', project.id);
            }}
          />
        ) : (
          <ProjectList
            projects={projects}
            isLoading={isLoading}
            onCreateClick={() => setShowCreate(true)}
            viewMode={viewMode}
          />
        )}

        {/* Pagination */}
        {meta && total > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-content-border pt-4">
            <p className="text-sm text-content-text-muted">
              Showing {from}–{to} of {total} projects
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </Button>
                {pageNumbers.map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e-${i}`} className="px-2 text-content-text-muted">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`h-8 min-w-[32px] rounded-md px-2 text-sm font-medium transition-colors ${
                        p === currentPage
                          ? 'bg-accent-blue text-white'
                          : 'text-content-text hover:bg-content-bg-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <p className="text-sm text-content-text-secondary">
                Spin up a new workspace project for your AI agents to work on.
              </p>
            </DialogHeader>
            <form id="create-project-form" onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-content-text" htmlFor="name">
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Agent Project Manager"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-content-text" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Short description of this project"
                    className="flex min-h-[80px] w-full rounded-md border border-content-border bg-content-bg-secondary px-3 py-2 text-sm text-content-text placeholder:text-content-text-muted focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="type">
                      Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      defaultValue="team"
                      className="flex h-9 w-full rounded-md border border-content-border bg-content-bg-secondary px-3 py-1.5 text-sm text-content-text"
                    >
                      <option value="personal">Personal</option>
                      <option value="team">Team</option>
                      <option value="experiment">Experiment</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="visibility">
                      Visibility
                    </label>
                    <select
                      id="visibility"
                      name="visibility"
                      defaultValue="internal"
                      className="flex h-9 w-full rounded-md border border-content-border bg-content-bg-secondary px-3 py-1.5 text-sm text-content-text"
                    >
                      <option value="private">Private</option>
                      <option value="internal">Internal</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="templateId">
                      Template (Optional)
                    </label>
                    <select
                      id="templateId"
                      name="templateId"
                      className="flex h-9 w-full rounded-md border border-content-border bg-content-bg-secondary px-3 py-1.5 text-sm text-content-text"
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
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? 'Creating...' : 'Create project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}
