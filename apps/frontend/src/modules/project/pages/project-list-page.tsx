import { useState } from 'react';
import { useProjectList } from '../hooks/use-project-list';
import { useCreateProject } from '../hooks/use-project-mutations';
import { ProjectFilterSidebar } from '../components/project-filter-sidebar';
import { ProjectList } from '../components/project-list';
import type { ProjectListParams, ProjectType, ProjectVisibility } from '../api/project-api';
import { useProjectTemplates } from '@/modules/core-config/hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, ChevronLeft, ChevronRight, Search, Columns } from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';

export function ProjectListPage() {
  const { theme } = useTheme();
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
    <div className="flex h-full flex-col overflow-hidden bg-content-bg text-content-text">
      {/* Linear-style page header: title + view tabs + actions */}
      <header className="flex shrink-0 items-center justify-between border-b border-content-border bg-content-bg px-6 py-4">
        <div className="flex items-center gap-5">
          <h1 className="m-0 text-title font-semibold text-content-text">Projects</h1>
          <div className="inline-flex overflow-hidden rounded-md border border-content-border">
            <button
              type="button"
              className="border-r border-content-border bg-content-bg-secondary px-4 py-1.5 text-sm font-medium text-content-text hover:bg-content-bg-secondary"
            >
              All projects
            </button>
            <button
              type="button"
              className="bg-transparent px-4 py-1.5 text-sm text-content-text-muted hover:text-content-text"
            >
              + New view
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-3 z-10 text-content-text-muted"
            />
            <Input
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
              className="w-[180px] pl-9"
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
          <Button variant="secondary" size="sm">
            <Columns size={14} />
            Display
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New project
          </Button>
        </div>
      </header>

      {/* Table area */}
      <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6">
        <ProjectList
          projects={projects}
          isLoading={isLoading}
          onCreateClick={() => setShowCreate(true)}
        />

        {meta && totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-end gap-3 pt-4 text-xs text-content-text-muted">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={14} />
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
            >
              Next
              <ChevronRight size={14} />
            </Button>
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
    </div>
  );
}
