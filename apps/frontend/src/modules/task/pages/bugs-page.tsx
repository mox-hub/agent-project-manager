/**
 * BugsPage - 全局 Bug 追踪页面
 * @author mox
 * @description 全局 Bug 追踪页面
 * @version 1.0.0
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, CheckCircle2, Bug, AlertTriangle, List, Kanban, Trash2,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle';
import { usePersistentToggle } from '@/shared/hooks/use-persistent-toggle';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import { ToolbarRow, useToolbarViews, normalizeFilterSelection, toggleFilterValue } from '@/components/ui/toolbar-row';
import { useAllBugs, useDeleteTask, useUpdateTask } from '../hooks/use-project-tasks';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import type { Task } from '../api/task-api';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { ListActionButton } from '@/components/ui/data-list';
import { BugSimpleList } from '../components/bug-simple-list';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { BoardView, type BoardColumnDef } from '@/shared/components/board-view/board-view';
import {
  bugCardModel,
  getProjectColumns,
  getSeverityColumns,
  getTaskStatusColumns,
} from '../components/board-presets';

type ViewMode = 'list' | 'board';
type GroupBy = 'none' | 'status' | 'severity' | 'project';
type Severity = 'critical' | 'high' | 'medium' | 'low';

export function BugsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [search, setSearch] = useState('');
  // Filter 多选（空数组 = 该维度不做筛选）
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [severityFilters, setSeverityFilters] = useState<string[]>([]);
  const [projectFilters, setProjectFilters] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const statsCards = usePersistentToggle('bugs-page.stats');

  // 已保存视图：快照记忆当前页全部筛选 + 显示样式 + 分组
  const toolbar = useToolbarViews({
    key: 'bugs-page',
    defaults: [{
      id: 'all',
      name: t('task.filter.all', 'All'),
      icon: 'bug',
      builtIn: true,
      snapshot: { search: '', status: [], severity: [], project: [], viewMode: 'list', groupBy: 'none' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; status: string | string[]; severity: string | string[];
        project: string | string[]; viewMode: ViewMode; groupBy: GroupBy;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilters(normalizeFilterSelection(snap.status));
      setSeverityFilters(normalizeFilterSelection(snap.severity));
      setProjectFilters(normalizeFilterSelection(snap.project));
      const nextView = snap.viewMode ?? 'list';
      setViewMode(nextView);
      setGroupBy(nextView === 'board' && (snap.groupBy ?? 'none') === 'none' ? 'status' : (snap.groupBy ?? 'none'));
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilters, severity: severityFilters, project: projectFilters, viewMode, groupBy });
  }, [updateActiveSnapshot, search, statusFilters, severityFilters, projectFilters, viewMode, groupBy]);

  // 使用真实 API 获取所有 Bug
  const { data: bugsData, isLoading, refetch } = useAllBugs({
    pageSize: 100,
  });

  // 获取项目列表用于过滤
  const { data: projectsResponse } = useProjectList();
  const projects = projectsResponse?.items ?? [];
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const confirmAction = useConfirm();

  const allBugs = useMemo(() => bugsData?.data ?? [], [bugsData]);
  const updateTask = useUpdateTask();

  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return 'Inbox';
    return projects.find((p) => p.id === projectId)?.name || projectId;
  };

  // Filter bugs based on filters
  const filteredBugs = useMemo(() => {
    return allBugs.filter((bug) => {
      if (search && !bug.title.toLowerCase().includes(search.toLowerCase()) &&
          !bug.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilters.length > 0 && !statusFilters.includes(bug.status)) {
        return false;
      }
      // Use severity from task if available, otherwise derive from priority
      const bugSeverity = bug.severity || (bug.priority === 'critical' ? 'critical' : bug.priority === 'high' ? 'high' : bug.priority === 'medium' ? 'medium' : 'low') as Severity;
      if (severityFilters.length > 0 && !severityFilters.includes(bugSeverity)) {
        return false;
      }
      if (projectFilters.length > 0 && !projectFilters.includes(bug.projectId ?? '')) {
        return false;
      }
      return true;
    });
  }, [allBugs, search, statusFilters, severityFilters, projectFilters]);

  // Statistics
  const stats = useMemo(() => {
    const critical = filteredBugs.filter((b) => b.severity === 'critical').length;
    const open = filteredBugs.filter((b) => b.status !== 'done' && b.status !== 'canceled').length;
    const resolved = filteredBugs.filter((b) => b.status === 'done').length;
    return { critical, open, resolved };
  }, [filteredBugs]);

  const handleBugClick = (bug: Task) => {
    navigate(`/app/bugs/${bug.id}`);
  };

  const handleCreateBug = () => {
    setShowCreateDialog(true);
  };

  return (
    <PageShell aiPage="bugs.bugs-list" className="overflow-hidden">
      {/* Header */}
      <PageHeader
        title={t("task.bug.title") || "All Bugs"}
        icon={Bug}
        iconColor="text-accent-red"
        metrics={[
          { id: 'total', label: t("task.bug.title"), value: filteredBugs.length },
          { id: 'open', label: t("task.bug.open") || 'open', value: stats.open, tone: 'warning' },
          { id: 'critical', label: t("task.bug.critical") || 'critical', value: stats.critical, tone: 'danger' },
          { id: 'resolved', label: t("task.bug.resolved") || 'resolved', value: stats.resolved, tone: 'success' },
        ]}
        actions={
          <>
            <QuickCardsToggle
              visible={statsCards.visible}
              onToggle={statsCards.toggle}
              label={t('task.showStats', 'Stats')}
              activeLabel={t('task.hideStats', 'Hide stats')}
              aiId="bugs.bugs-list.stats-toggle"
            />
            <HeaderActionButton icon={Plus} label={t("task.bug.report")} onClick={handleCreateBug} />
          </>
        }
      />

      {/* Unified Create Dialog */}
      <UnifiedCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultType="bug"
        onSuccess={(type, id) => {
          console.log(`Created ${type} with id: ${id}`);
          refetch();
        }}
      />

      {/* Stats Cards（默认隐藏，header 幽灵按钮切换） */}
      {statsCards.visible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard
            items={[
              {
                key: 'critical',
                value: stats.critical,
                label: t("task.bug.severity.critical"),
                icon: AlertTriangle,
                ...STATS_THEMES.red,
              },
              {
                key: 'open',
                value: stats.open,
                label: t("task.bug.status.open"),
                icon: Bug,
                ...STATS_THEMES.blue,
              },
              {
                key: 'resolved',
                value: stats.resolved,
                label: t("task.bug.resolved"),
                icon: CheckCircle2,
                ...STATS_THEMES.green,
              },
            ]}
            columns={3}
            className="grid grid-cols-3 gap-3"
          />
        </div>
      ) : null}

      {/* Toolbar: 已保存视图 + 视图样式 + 筛选/显示/下载 */}
      <ToolbarRow
        aiId="bugs.bugs-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: viewMode,
          onChange: (v) => {
            setViewMode(v as ViewMode);
            // board 视图不支持 no grouping，切入时兜底为按状态分组
            if (v === 'board' && groupBy === 'none') setGroupBy('status');
          },
          options: [
            { value: 'list', label: t('task.view.list', 'List'), icon: List },
            { value: 'board', label: t('task.view.board', 'Board'), icon: Kanban },
          ],
        }}
        filterMenu={{
          badge: [statusFilters.length > 0, severityFilters.length > 0, projectFilters.length > 0].filter(Boolean).length,
          search: { value: search, onChange: setSearch, placeholder: t('task.bug.filter.searchPlaceholder') },
          items: [
            { type: 'label', label: t('task.status.group', 'Status') },
            { id: 'status-all', type: 'checkbox', label: t('task.status.all'), checked: statusFilters.length === 0, onSelect: () => setStatusFilters([]) },
            ...(['todo', 'in_progress', 'in_review', 'done', 'canceled'] as const).map((value) => ({
              id: `status-${value}`,
              type: 'checkbox' as const,
              label: t(`task.status.${value}`),
              checked: statusFilters.includes(value),
              onSelect: () => setStatusFilters((prev) => toggleFilterValue(prev, value)),
            })),
            { type: 'separator' },
            { type: 'label', label: t('task.severity.group', 'Severity') },
            { id: 'severity-all', type: 'checkbox', label: t('task.bug.filter.allSeverity'), checked: severityFilters.length === 0, onSelect: () => setSeverityFilters([]) },
            ...(['critical', 'high', 'medium', 'low'] as const).map((value) => ({
              id: `severity-${value}`,
              type: 'checkbox' as const,
              label: t(`task.bug.severity.${value}`),
              checked: severityFilters.includes(value),
              onSelect: () => setSeverityFilters((prev) => toggleFilterValue(prev, value)),
            })),
            { type: 'separator' },
            { type: 'label', label: t('task.filter.projectGroup', 'Project') },
            { id: 'project-all', type: 'checkbox', label: t('task.filter.allProjects'), checked: projectFilters.length === 0, onSelect: () => setProjectFilters([]) },
            ...projects.map((p) => ({
              id: `project-${p.id}`,
              type: 'checkbox' as const,
              label: p.name,
              checked: projectFilters.includes(p.id),
              onSelect: () => setProjectFilters((prev) => toggleFilterValue(prev, p.id)),
            })),
          ],
        }}
        displayMenu={{
          items: [
            { type: 'label', label: t('task.groupBy.label', 'Group by') },
            // board 视图不支持 no grouping，仅 list 视图提供该项
            ...(viewMode === 'list' ? [{
              id: 'groupby-none',
              type: 'checkbox' as const,
              label: t('task.groupBy.none', 'No grouping'),
              checked: groupBy === 'none',
              onSelect: () => setGroupBy('none'),
            }] : []),
            ...(['status', 'severity', 'project'] as const).map((value) => ({
              id: `groupby-${value}`,
              type: 'checkbox' as const,
              label: t(`task.groupBy.${value}`),
              checked: groupBy === value,
              onSelect: () => setGroupBy(value),
            })),
          ],
        }}
        downloadMenu={{
          items: [
            { type: 'label', label: t('task.export.label', 'Export') },
            { id: 'csv', type: 'item', label: 'CSV', disabled: true },
            { id: 'json', type: 'item', label: 'JSON', disabled: true },
          ],
        }}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="w-full">
          {viewMode === 'list' ? (
            <BugSimpleList
              bugs={filteredBugs}
              loading={isLoading}
              onBugClick={handleBugClick}
              groupBy={groupBy}
              getProjectName={getProjectName}
              onGroupCreate={() => setShowCreateDialog(true)}
              selectionActions={(selected, close) => (
                <ListActionButton
                  onClick={async () => {
                    const ok = await confirmAction({
                      title: `删除选中的 ${selected.length} 项？`,
                      description: '该操作会删除选中的 Bug 及其子任务，且不可撤销。',
                      confirmText: '删除',
                      cancelText: '取消',
                      variant: 'destructive',
                    });
                    if (!ok) return;
                    await Promise.allSettled(selected.map((bug) => deleteTask.mutateAsync(bug.id)));
                    close();
                    queryClient.invalidateQueries({ queryKey: ['bugs'] });
                    refetch();
                  }}
                  title="删除"
                  className="text-destructive"
                >
                  <Trash2 className="size-4" /> 删除
                </ListActionButton>
              )}
            />
          ) : (
            <BugBoardView
              bugs={filteredBugs}
              loading={isLoading}
              groupBy={groupBy === 'none' ? 'status' : groupBy}
              projects={projects}
              onBugClick={handleBugClick}
              onMoveBug={(bug, data) => updateTask.mutate({ taskId: bug.id, data })}
            />
          )}
        </div>
      </div>

      </PageShell>
  );
}

// Bug Board View Component（基于通用 BoardView，severity 左边框经卡片槽位保留）
function BugBoardView({
  bugs,
  groupBy,
  projects,
  onBugClick,
  onMoveBug,
  loading,
}: {
  bugs: Task[];
  groupBy: GroupBy;
  projects: { id: string; name: string }[];
  loading?: boolean;
  onBugClick: (bug: Task) => void;
  onMoveBug?: (bug: Task, data: { status?: string; severity?: Task['severity'] }) => void;
}) {
  const { t } = useTranslation();

  const columns = useMemo<BoardColumnDef[]>(() => {
    switch (groupBy) {
      case 'status':
        return getTaskStatusColumns(t);
      case 'severity':
        return getSeverityColumns(t);
      case 'project':
        return getProjectColumns(
          projects,
          bugs.map((bug) => bug.projectId || 'inbox'),
        );
      default:
        return [{ id: 'all', title: t('task.filter.all', 'All'), icon: Bug, color: 'red' }];
    }
  }, [groupBy, projects, t, bugs]);

  const groupByFn = (bug: Task): string => {
    switch (groupBy) {
      case 'status':
        return bug.status || 'todo';
      case 'severity':
        return bug.severity || 'low';
      case 'project':
        return bug.projectId || 'inbox';
      default:
        return 'all';
    }
  };

  // 拖拽落库：status/severity 分组更新对应字段；project 分组无对应更新接口，仅本地排序
  const handleItemMove =
    groupBy === 'status' || groupBy === 'severity'
      ? (bug: Task, toColumnId: string) => {
          if (groupBy === 'status') {
            if (bug.status !== toColumnId) onMoveBug?.(bug, { status: toColumnId });
          } else if (bug.severity !== toColumnId) {
            onMoveBug?.(bug, { severity: toColumnId as Task['severity'] });
          }
        }
      : undefined;

  return (
    <BoardView<Task>
      className="h-full"
      columns={columns}
      items={bugs}
      loading={loading}
      groupBy={groupByFn}
      card={bugCardModel}
      onItemMove={handleItemMove}
      onItemClick={(bug) => onBugClick(bug)}
    />
  );
}
