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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { MENU_ITEM_CLASS, MENU_LABEL_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { AttentionRail } from '@/components/ui/attention-rail';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ViewSwitcher, type ViewMode } from '@/components/view-switcher';
import { FilterPanel } from '@/shared/ui/filter-panel';
import { buildFilterStateFromQuery, buildQueryFromFilterState } from '@/shared/filters/adapters';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
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
  { key: 'icon', label: '图标' },
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
  const [createProjectForm, setCreateProjectForm] = useState({
    type: 'team',
    visibility: 'internal',
    icon: 'folder',
    templateId: '',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [viewSettingsAnchor, setViewSettingsAnchor] = useState<DOMRect | null>(null);
  const visibleColumns = useAppStore((state) => state.projectListVisibleColumns as ProjectListColumnKey[]);
  const setVisibleColumns = useAppStore((state) => state.setProjectListVisibleColumns);

  const { data, isLoading } = useProjectList(filters);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: templates = [] } = useProjectTemplates();

  const resetCreateProjectForm = () => {
    setCreateProjectForm({
      type: 'team',
      visibility: 'internal',
      icon: 'folder',
      templateId: '',
    });
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    if (!name) return;

    const description = String(formData.get('description') ?? '').trim() || undefined;
    const type = createProjectForm.type as ProjectType;
    const visibility = createProjectForm.visibility as ProjectVisibility;
    const templateId = createProjectForm.templateId.trim() || undefined;
    const icon = createProjectForm.icon.trim() || undefined;
    const color = String(formData.get('color') ?? '').trim() || undefined;

    createProject.mutate(
      {
        name,
        description,
        type,
        visibility,
        templateId,
        icon,
        color,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          resetCreateProjectForm();
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

  useEffect(() => {
    if (visibleColumns.includes('icon')) return;
    setVisibleColumns(
      PROJECT_COLUMN_OPTIONS
        .map((option) => option.key)
        .filter((key) => key === 'icon' || visibleColumns.includes(key)),
    );
  }, [setVisibleColumns, visibleColumns]);

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.projectList}>
      {/* Page header: title, description, view toggles, Export, New Project */}
      <PageHeader
        aiId="project.project-list"
        title="Projects"
        description={`${total} projects`}
        actions={(
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-content-border bg-content-bg text-content-text-secondary hover:bg-content-bg-secondary"
              data-ai-component="project.project-list.header.export"
              data-ai-action="project.project-list.header.export.click"
              data-ai-role="jump"
            >
              <Download size={14} />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="h-9 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90"
              data-ai-component="project.project-list.header.new-project"
              data-ai-action="project.project-list.header.new-project.click"
              data-ai-role="submit"
            >
              <Plus size={14} />
              New Project
            </Button>
          </>
        )}
      />

      {/* Search + filters row */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-content-border bg-content-bg px-6 py-3 md:px-7"
        data-ai-component="project.project-list.context-bar"
        data-ai-role="filter"
      >
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} className="text-content-text-muted" />
            </InputGroupAddon>
            <InputGroupInput
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
              className="w-full"
            />
          </InputGroup>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
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
            className={`fixed z-40 w-[240px] p-2 ${MENU_SURFACE_CLASS}`}
            style={{
              top: Math.min(window.innerHeight - 16 - 320, viewSettingsAnchor.bottom + 8),
              left: Math.max(12, Math.min(viewSettingsAnchor.right - 240, window.innerWidth - 252)),
            }}
          >
            <div className={`mb-2 ${MENU_LABEL_CLASS}`}>
              列显示
            </div>
            <ScrollArea className="max-h-[280px] space-y-1">
              {PROJECT_COLUMN_OPTIONS.map((column) => {
                const checked = visibleColumns.includes(column.key);
                return (
                  <button
                    key={column.key}
                    type="button"
                    className={`${MENU_ITEM_CLASS} justify-between text-content-text`}
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
            </ScrollArea>
          </div>
        </>
      )}

      {/* Table area - full width so list can fill */}
      <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden px-6 pb-5 pt-3 md:px-7">
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
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-content-border pt-3">
            <p className="text-xs text-content-text-muted">
              Showing {from}–{to} of {total} projects
            </p>
            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {pageNumbers.map((p, i) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key={`e-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage + 1);
                      }}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}

        <div className="mt-4">
          <AttentionRail
            aiPrefix="project.project-list"
            items={[
              {
                id: 'task-workspace',
                title: '进入任务工作台',
                description: '在看板/列表/甘特视图推进任务',
                to: '/app/projects/dashboard',
              },
              {
                id: 'metadata-settings',
                title: '查看元数据设置',
                description: '管理状态、标签、角色与模板',
                to: '/app/settings/metadata',
              },
            ]}
          />
        </div>
      </div>

      {showCreate && (
        <Dialog
          open={showCreate}
          onOpenChange={(open) => {
            setShowCreate(open);
            if (!open) {
              resetCreateProjectForm();
            }
          }}
        >
          <DialogContent className="max-w-[640px]">
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
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Short description of this project"
                    className="bg-content-bg-secondary"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="type">
                      Type
                    </label>
                    <Select
                      value={createProjectForm.type}
                      onValueChange={(value) =>
                        setCreateProjectForm((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger id="type" className="w-full bg-content-bg-secondary">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="experiment">Experiment</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="visibility">
                      Visibility
                    </label>
                    <Select
                      value={createProjectForm.visibility}
                      onValueChange={(value) =>
                        setCreateProjectForm((prev) => ({ ...prev, visibility: value }))
                      }
                    >
                      <SelectTrigger id="visibility" className="w-full bg-content-bg-secondary">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="icon">
                      Icon Style
                    </label>
                    <Select
                      value={createProjectForm.icon}
                      onValueChange={(value) =>
                        setCreateProjectForm((prev) => ({ ...prev, icon: value }))
                      }
                    >
                      <SelectTrigger id="icon" className="w-full bg-content-bg-secondary">
                        <SelectValue placeholder="Select icon style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="folder">Folder</SelectItem>
                        <SelectItem value="rocket">Rocket</SelectItem>
                        <SelectItem value="target">Target</SelectItem>
                        <SelectItem value="tooling">Tooling</SelectItem>
                        <SelectItem value="spark">Spark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="color">
                      Icon Color
                    </label>
                    <div className="flex items-center gap-2 rounded-md border border-content-border bg-content-bg-secondary px-3 py-1.5">
                      <Input
                        id="color"
                        name="color"
                        type="color"
                        defaultValue="#5E6AD2"
                        className="h-6 w-9 cursor-pointer rounded border border-content-border bg-transparent p-0 shadow-none"
                      />
                      <span className="text-xs text-content-text-muted">Choose icon background color</span>
                    </div>
                  </div>
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content-text" htmlFor="templateId">
                      Template (Optional)
                    </label>
                    <Select
                      value={createProjectForm.templateId || '__none__'}
                      onValueChange={(value) =>
                        setCreateProjectForm((prev) => ({
                          ...prev,
                          templateId: value === '__none__' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id="templateId" className="w-full bg-content-bg-secondary">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
