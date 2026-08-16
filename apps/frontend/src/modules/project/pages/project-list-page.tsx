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
import { SkeletonList } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { MENU_ITEM_CLASS, MENU_LABEL_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
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
import { ViewSwitcher, type ViewMode } from '@/shared/components/view-switcher';
import { ExpandableSearch } from '@/shared/components/expandable-search';
import { FilterPanel } from '@/shared/ui/filter-panel';
import { buildFilterStateFromQuery, buildQueryFromFilterState } from '@/shared/filters/adapters';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
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
  ListFilter,
  Settings,
  Check,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PROJECT_FILTER_KEYS = [
  'status',
  'type',
  'memberId',
  'priority',
  'workflowStatus',
  'riskLevel',
  'ownerId',
] as const;

const getColumnOptions = (t: (key: string) => string): { key: ProjectListColumnKey; label: string }[] => [
  { key: 'icon', label: t("project.columns.icon") },
  { key: 'name', label: t("project.columns.name") },
  { key: 'health', label: t("project.columns.health") },
  { key: 'priority', label: t("project.columns.priority") },
  { key: 'owner', label: t("project.columns.owner") },
  { key: 'members', label: t("project.columns.members") },
  { key: 'start', label: t("project.columns.start") },
  { key: 'target', label: t("project.columns.target") },
  { key: 'progress', label: t("project.columns.progress") },
  { key: 'updated', label: t("project.columns.updated") },
  { key: 'status', label: t("project.columns.status") },
];

export function ProjectListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProjectListParams>({
    filters: {
      status: ['active'],
    },
    page: 1,
    pageSize: 20,
  });
  const [showUnifiedCreate, setShowUnifiedCreate] = useState(false);
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

  const { data, isLoading, isError, error, refetch } = useProjectList(filters);
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

  const projects = data?.items ?? [];
  const projectFilterGroups = useProjectFilterOptions({ projects });
  const currentPage = data?.page ?? filters.page ?? 1;
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? projects.length;
  const pageSize = data?.pageSize ?? filters.pageSize ?? 20;
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
      getColumnOptions(t)
        .map((option) => option.key)
        .filter((key) => key === 'icon' || visibleColumns.includes(key)),
    );
  }, [setVisibleColumns, visibleColumns, t]);

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.projectList}>
      {/* Page header: title, description, view toggles, Export, New Project */}
      <PageHeader
        aiId="project.project-list"
        title={t("project.title")}
        description={`${total} ${t("project.projects") || 'projects'}`}
        icon={FolderOpen}
        iconColor="text-accent-blue"
        actions={(
          <>
            <Button
              size="sm"
              onClick={() => setShowUnifiedCreate(true)}
              className="h-9 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90"
              data-ai-component="project.project-list.header.new-project"
              data-ai-action="project.project-list.header.new-project.click"
              data-ai-role="submit"
            >
              <Plus size={14} />
              {t("project.create")}
            </Button>
          </>
        )}
      />

      {/* Search + filters row */}
      <div
        className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-6 py-2.5 md:px-7"
        data-ai-component="project.project-list.context-bar"
        data-ai-role="filter"
      >
        {/* 左侧：筛选、设置、搜索按钮 */}
        <div className="flex items-center gap-2">
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
            buttonText={t("common.filters")}
            buttonIcon={<ListFilter size={14} />}
            iconOnly
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="h-7 w-7 rounded-full border-border bg-background text-muted-foreground hover:bg-muted/50"
            title={t("project.viewSettings") || "View settings"}
            aria-label={t("project.viewSettings") || "View settings"}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setViewSettingsAnchor(rect);
              setShowViewSettings((prev) => !prev);
            }}
          >
            <Settings size={14} />
          </Button>
          <ExpandableSearch
            value={filters.q ?? ''}
            onChange={(value) => {
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
            placeholder={t("project.searchPlaceholder") || "Search projects..."}
            buttonSize="sm"
          />
        </div>

        {/* 右侧：视图切换、导出 */}
        <div className="ml-auto flex items-center gap-2">
          <ViewSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            modes={['list', 'board', 'gantt']}
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="h-7 w-7 rounded-full border-border bg-background text-muted-foreground hover:bg-muted/50"
            data-ai-component="project.project-list.context.export"
            data-ai-action="project.project-list.context.export.click"
            data-ai-role="jump"
          >
            <Download size={14} />
          </Button>
        </div>
      </div>

      {showViewSettings && viewSettingsAnchor && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowViewSettings(false)} />
          <div
            className="fixed z-40 overflow-hidden rounded-lg border border-border bg-popover p-2 shadow-lg"
            style={{
              top: viewSettingsAnchor.bottom + 8,
              left: viewSettingsAnchor.left,
            }}
          >
            <div className="mb-2 text-xs font-medium text-foreground">
              {t("project.columns.display")}
            </div>
            <ScrollArea className="max-h-[240px]">
              {getColumnOptions(t).map((column) => {
                const checked = visibleColumns.includes(column.key);
                return (
                  <button
                    key={column.key}
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                    onClick={() => {
                      const prev = visibleColumns;
                      if (checked) {
                        if (prev.length <= 1) return;
                        setVisibleColumns(prev.filter((key) => key !== column.key));
                        return;
                      }
                      const next = [...prev, column.key];
                      setVisibleColumns(
                        getColumnOptions(t)
                          .map((option) => option.key)
                          .filter((key) => next.includes(key)),
                      );
                    }}
                  >
                    <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{column.label}</span>
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border',
                        checked ? 'border-accent-blue bg-accent-blue' : 'border-border',
                      )}
                    >
                      {checked && <Check size={8} className="text-gray-950" />}
                    </div>
                  </button>
                );
              })}
            </ScrollArea>
          </div>
        </>
      )}

      {/* Table area - full width so list can fill */}
      <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden px-6 pb-4 pt-2 md:px-7">
        {isLoading ? (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonList count={1} avatar />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center">
            <Alert variant="destructive" className="max-w-md">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                {error?.message ?? 'Failed to load projects. Please try again.'}
              </AlertDescription>
              <div className="mt-3">
                <Button size="sm" variant="destructive" onClick={() => refetch()}>
                  重试
                </Button>
              </div>
            </Alert>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No projects found</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={14} />
                New Project
              </Button>
            </div>
          </div>
        ) : (
          <>
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
                isLoading={false}
                onCreateClick={() => setShowCreate(true)}
                viewMode={viewMode}
                visibleColumns={visibleColumns}
                onPatchProject={async (projectId, data) => {
                  await updateProject.mutateAsync({ projectId, data });
                }}
              />
            )}
          </>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border pt-2.5">
            <p className="text-[11px] text-muted-foreground">
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
          <DialogContent className="max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Spin up a new workspace project for your AI agents to work on.
              </p>
            </DialogHeader>
            <form id="create-project-form" onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="name">
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Agent Project Manager"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="description">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Short description of this project"
                    className="bg-muted/50 text-xs"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="type">
                      Type
                    </label>
                    <Select
                      value={createProjectForm.type}
                      onValueChange={(value) =>
                        setCreateProjectForm((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger id="type" className="h-8 w-full bg-muted/50 text-xs">
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
                    <label className="text-xs font-medium text-foreground" htmlFor="visibility">
                      Visibility
                    </label>
                    <Select
                      value={createProjectForm.visibility}
                      onValueChange={(value) =>
                        setCreateProjectForm((prev) => ({ ...prev, visibility: value }))
                      }
                    >
                      <SelectTrigger id="visibility" className="h-8 w-full bg-muted/50 text-xs">
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
                    <label className="text-xs font-medium text-foreground" htmlFor="icon">
                      Icon Style
                    </label>
                    <Select
                      value={createProjectForm.icon}
                      onValueChange={(value) =>
                        setCreateProjectForm((prev) => ({ ...prev, icon: value }))
                      }
                    >
                      <SelectTrigger id="icon" className="h-8 w-full bg-muted/50 text-xs">
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
                    <label className="text-xs font-medium text-foreground" htmlFor="color">
                      Icon Color
                    </label>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5">
                      <Input
                        id="color"
                        name="color"
                        type="color"
                        defaultValue="#5E6AD2"
                        className="h-6 w-9 cursor-pointer rounded border border-border bg-transparent p-0 shadow-none"
                      />
                      <span className="text-xs text-muted-foreground">Choose icon background color</span>
                    </div>
                  </div>
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="templateId">
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
                      <SelectTrigger id="templateId" className="h-8 w-full bg-muted/50 text-xs">
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
      <UnifiedCreateDialog
        open={showUnifiedCreate}
        onOpenChange={setShowUnifiedCreate}
        defaultType="project"
        onSuccess={() => {
          setShowUnifiedCreate(false);
        }}
      />
    </PageShell>
  );
}
