import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectList } from '../hooks/use-project-list';
import { useCreateProject, useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectFilterOptions } from '../hooks/use-project-filter-options';
import { ProjectList, type ProjectListColumnKey } from '../components/project-list';
import { ProjectBoard } from '../components/project-board';
import { ProjectGantt } from '../components/project-gantt';
import type {
  ProjectListParams,
  ProjectType,
  ProjectVisibility,
} from '../api/project-api';
import { useProjectTemplates } from '@/modules/core-config/hooks/use-metadata';
import { useAppStore } from '@/infrastructure/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ViewSwitcher, type ViewMode } from '@/components/view-switcher';
import { FilterPanel } from '@/shared/ui/filter-panel';
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
  Search,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Settings,
} from 'lucide-react';

const PROJECT_FILTER_KEYS = [
  'status',
  'type',
  'memberId',
  'priority',
  'workflowStatus',
  'riskLevel',
  'ownerId',
] as const;

const PROJECT_COLUMN_OPTIONS: { key: ProjectListColumnKey; label: string }[] = [
  { key: 'name', label: '名称' },
  { key: 'health', label: '健康度' },
  { key: 'priority', label: '优先级' },
  { key: 'owner', label: '负责人' },
  { key: 'members', label: '成员' },
  { key: 'start', label: '开始时间' },
  { key: 'target', label: '目标时间' },
  { key: 'progress', label: '进度' },
  { key: 'updated', label: '更新时间' },
  { key: 'status', label: '状态' },
];

export function ProjectListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProjectListParams>({
    filters: {
      status: ['active'],
    },
    page: 1,
    pageSize: 20,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [viewSettingsAnchor, setViewSettingsAnchor] = useState<DOMRect | null>(null);
  const visibleColumns = useAppStore((state) => state.projectListVisibleColumns as ProjectListColumnKey[]);
  const setVisibleColumns = useAppStore((state) => state.setProjectListVisibleColumns);

  const { data, isLoading } = useProjectList(filters);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
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

  useEffect(() => {
    if (!showViewSettings) return;
    const handleClose = () => setShowViewSettings(false);
    window.addEventListener('resize', handleClose);
    return () => window.removeEventListener('resize', handleClose);
  }, [showViewSettings]);

  return (
    <PageShell className="overflow-hidden">
      {/* Page header: title, description, view toggles, Export, New Project */}
      <PageHeader
        title="Project Workspace"
        description="Central hub for tracking all cross-functional initiatives and deliverables."
        actions={(
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-content-border bg-content-bg text-content-text-secondary hover:bg-content-bg-secondary"
            >
              <Download size={14} />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="h-9 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90"
            >
              <Plus size={14} />
              New Project
            </Button>
          </>
        )}
      />

      {/* Search + filters row */}
      <div className="flex flex-wrap items-center gap-3 border-b border-content-border bg-content-bg px-6 py-4">
        <div className="relative flex-1 min-w-[240px] max-w-[420px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-content-text-muted"
          />
          <Input
            type="search"
            placeholder="Search projects..."
            value={filters.q ?? ''}
            onChange={(e) => {
              const value = e.target.value;
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
            className="w-full pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ViewSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            modes={['list', 'board', 'gantt']}
            className="rounded-full border-content-border bg-content-bg"
          />
          <FilterPanel
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
            buttonText="筛选"
            buttonIcon={<ListFilter size={14} />}
            iconOnly
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full border-content-border bg-content-bg text-content-text-secondary hover:bg-content-bg-secondary"
            title="View settings"
            aria-label="View settings"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setViewSettingsAnchor(rect);
              setShowViewSettings((prev) => !prev);
            }}
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {showViewSettings && viewSettingsAnchor && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowViewSettings(false)} />
          <div
            className="fixed z-40 w-[240px] rounded-xl border border-content-border bg-content-bg p-2 shadow-xl"
            style={{
              top: Math.min(window.innerHeight - 16 - 320, viewSettingsAnchor.bottom + 8),
              left: Math.max(12, Math.min(viewSettingsAnchor.right - 240, window.innerWidth - 252)),
            }}
          >
            <div className="mb-2 px-2 py-1 text-xs font-medium uppercase tracking-[0.04em] text-content-text-muted">
              列显示
            </div>
            <div className="max-h-[280px] space-y-1 overflow-y-auto">
              {PROJECT_COLUMN_OPTIONS.map((column) => {
                const checked = visibleColumns.includes(column.key);
                return (
                  <button
                    key={column.key}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-content-text hover:bg-content-bg-secondary"
                    onClick={() => {
                      const prev = visibleColumns;
                      if (checked) {
                        if (prev.length <= 1) return;
                        setVisibleColumns(prev.filter((key) => key !== column.key));
                        return;
                      }
                      const next = [...prev, column.key];
                      setVisibleColumns(
                        PROJECT_COLUMN_OPTIONS
                          .map((option) => option.key)
                          .filter((key) => next.includes(key)),
                      );
                    }}
                  >
                    <span>{column.label}</span>
                    <span className={checked ? 'text-accent-blue' : 'text-content-text-muted'}>
                      {checked ? '✓' : '○'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Table area - full width so list can fill */}
      <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6 w-full min-w-0">
        {viewMode === 'board' ? (
          <ProjectBoard
            projects={projects}
            onProjectClick={(project) => {
              navigate(`/app/projects/${project.id}`);
            }}
            onProjectMove={(projectId, newStatus) => {
              updateProject.mutate({
                projectId,
                data: { status: newStatus as 'active' | 'archived' },
              });
            }}
          />
        ) : viewMode === 'gantt' ? (
          <ProjectGantt
            projects={projects}
            onProjectClick={(project) => {
              navigate(`/app/projects/${project.id}`);
            }}
            onDateRangeChange={(projectId, range) =>
              updateProject
                .mutateAsync({
                  projectId,
                  data: {
                    startDate: range.startDate,
                    targetDate: range.targetDate,
                  },
                })
                .then(() => undefined)
            }
          />
        ) : (
          <ProjectList
            projects={projects}
            isLoading={isLoading}
            onCreateClick={() => setShowCreate(true)}
            viewMode={viewMode}
            visibleColumns={visibleColumns}
            onPatchProject={async (projectId, data) => {
              await updateProject.mutateAsync({ projectId, data });
            }}
          />
        )}

        {/* Pagination */}
        {total > 0 && (
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
          <DialogContent className="max-w-[560px]">
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
