import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectList } from '../hooks/use-project-list';
import { useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectFilterOptions } from '../hooks/use-project-filter-options';
import { ProjectList, type ProjectListColumnKey } from '../components/project-list';
import { ProjectSimpleList } from '../components/project-simple-list';
import { ProjectFormDialog } from '../components/project-form-dialog';
import { ProjectBoard } from '../components/project-board';
import { ProjectGantt } from '../components/project-gantt';
import type { ProjectListParams, ProjectWorkflowStatus } from '../api/project-api';
import { useAppStore } from '@/infrastructure/store/app-store';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { ViewMode } from '@/shared/components/view-switcher';
import { buildFilterStateFromQuery, buildQueryFromFilterState } from '@/shared/filters/adapters';
import type { FilterState } from '@/shared/filters/types';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import {
  Plus,
  Settings,
  FolderOpen,
  AlertTriangle,
  List,
  Kanban,
  CalendarRange,
  Archive,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ListActionButton } from '@/components/ui/data-list';
import { useConfirm } from '@/shared/confirm/use-confirm';

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const visibleColumns = useAppStore((state) => state.projectListVisibleColumns as ProjectListColumnKey[]);
  const setVisibleColumns = useAppStore((state) => state.setProjectListVisibleColumns);

  // 已保存视图：快照记忆搜索 + 全部筛选 + 显示样式
  const toolbar = useToolbarViews({
    key: 'project-list-page',
    defaults: [{
      id: 'active',
      name: t('project.status.active', 'Active'),
      icon: 'folder',
      builtIn: true,
      snapshot: {
        q: '',
        filterState: { status: ['active'] } as FilterState,
        viewStyle: 'list',
      },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{ q: string; filterState: FilterState; viewStyle: ViewMode }>;
      setFilters(
        buildQueryFromFilterState<NonNullable<ProjectListParams['filters']>>(
          { q: snap.q || undefined, page: 1, pageSize: filters.pageSize },
          snap.filterState ?? {},
          PROJECT_FILTER_KEYS,
        ),
      );
      setViewMode(snap.viewStyle ?? 'list');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  const { data, isLoading, isError, error, refetch } = useProjectList(filters);
  const updateProject = useUpdateProject();
  const confirmAction = useConfirm();

  const projects = data?.items ?? [];
  const projectFilterGroups = useProjectFilterOptions({ projects });

  const currentFilterState = buildFilterStateFromQuery(filters.filters, PROJECT_FILTER_KEYS);

  const applyFilterState = (next: FilterState, q = filters.q) => {
    setFilters(
      buildQueryFromFilterState<NonNullable<ProjectListParams['filters']>>(
        { q: q || undefined, page: 1, pageSize: filters.pageSize },
        next,
        PROJECT_FILTER_KEYS,
      ),
    );
  };

  const toggleFilter = (groupId: string, optionId: string) => {
    const current = currentFilterState[groupId] ?? [];
    const next = current.includes(optionId)
      ? current.filter((value) => value !== optionId)
      : [...current, optionId];
    applyFilterState({ ...currentFilterState, [groupId]: next });
  };

  const toggleColumn = (key: ProjectListColumnKey) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length <= 1) return;
      setVisibleColumns(visibleColumns.filter((column) => column !== key));
      return;
    }
    const next = [...visibleColumns, key];
    setVisibleColumns(getColumnOptions(t).map((option) => option.key).filter((column) => next.includes(column)));
  };

  useEffect(() => {
    updateActiveSnapshot({
      q: filters.q ?? '',
      filterState: buildFilterStateFromQuery(filters.filters, PROJECT_FILTER_KEYS),
      viewStyle: viewMode,
    });
  }, [updateActiveSnapshot, filters.q, filters.filters, viewMode]);
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
        icon={FolderOpen}
        iconColor="text-accent-blue"
        metrics={[{ id: 'total', label: t("project.title"), value: total }]}
        actions={(
          <HeaderActionButton
            icon={Plus}
            label={t("project.create")}
            onClick={() => setShowUnifiedCreate(true)}
            data-ai-component="project.project-list.header.new-project"
            data-ai-action="project.project-list.header.new-project.click"
            data-ai-role="submit"
          />
        )}
      />

      {/* Toolbar: 已保存视图 + 视图样式 + 筛选/显示/下载 */}
      <ToolbarRow
        aiId="project.project-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: viewMode,
          onChange: (value) => setViewMode(value as ViewMode),
          options: [
            { value: 'list', label: t('project.view.list', 'List'), icon: List },
            { value: 'board', label: t('project.view.board', 'Board'), icon: Kanban },
            { value: 'gantt', label: t('project.view.gantt', 'Gantt'), icon: CalendarRange },
          ],
        }}
        filterMenu={{
          badge: Object.values(currentFilterState).reduce((count, values) => count + (values?.length ?? 0), 0),
          search: {
            value: filters.q ?? '',
            onChange: (value) => applyFilterState(currentFilterState, value),
            placeholder: t('project.messages.searchPlaceholder') || 'Search projects...',
          },
          items: projectFilterGroups.flatMap((group, groupIndex) => [
            ...(groupIndex > 0 ? [{ id: `sep-${group.id}`, type: 'separator' as const }] : []),
            { id: `label-${group.id}`, type: 'label' as const, label: group.label },
            ...group.options.map((option) => ({
              id: `${group.id}:${option.id}`,
              type: 'checkbox' as const,
              label: option.label,
              checked: (currentFilterState[group.id] ?? []).includes(option.id),
              onSelect: () => toggleFilter(group.id, option.id),
            })),
          ]),
        }}
        displayMenu={{
          items: [
            { id: 'columns-label', type: 'label', label: t('project.messages.columns.display') },
            ...getColumnOptions(t).map((column) => ({
              id: `col-${column.key}`,
              type: 'checkbox' as const,
              label: column.label,
              checked: visibleColumns.includes(column.key),
              onSelect: () => toggleColumn(column.key),
            })),
          ],
        }}
        downloadMenu={{
          items: [
            { id: 'export-label', type: 'label', label: t('project.export.label', 'Export') },
            { id: 'csv', type: 'item', label: 'CSV', disabled: true },
            { id: 'excel', type: 'item', label: 'Excel', disabled: true },
          ],
        }}
      />

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
                onProjectMove={(projectId, newWorkflowStatus) => {
                  updateProject.mutate({
                    projectId,
                    data: { workflowStatus: newWorkflowStatus as ProjectWorkflowStatus },
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
              <ProjectSimpleList
                projects={projects}
                loading={isLoading}
                onProjectClick={(project) => navigate(`/app/projects/${project.id}`)}
                selectionActions={(selected, close) => (
                  <ListActionButton
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: `归档选中的 ${selected.length} 个项目？`,
                        description: '归档后项目将从活跃列表移除，但数据会被保留。',
                        confirmText: '归档',
                        cancelText: '取消',
                      });
                      if (!ok) return;
                      await Promise.allSettled(
                        selected.map((project) =>
                          updateProject.mutateAsync({
                            projectId: project.id,
                            data: { status: 'archived' as const },
                          }),
                        ),
                      );
                      close();
                      refetch();
                    }}
                    title="归档"
                    className="text-muted-foreground"
                  >
                    <Archive className="size-4" /> 归档
                  </ListActionButton>
                )}
              />
            )}
          </>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border pt-2.5">
            <p className="text-11 text-muted-foreground">
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

      {/* 空态创建入口的对话框（create 模式；编辑模式在 ProjectSimpleList 右键里） */}
      <ProjectFormDialog open={showCreate} onOpenChange={setShowCreate} />
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
