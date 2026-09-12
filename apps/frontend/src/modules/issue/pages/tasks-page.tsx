/**
 * TasksPage - 全局任务管理页面
 * 使用真实 API 获取任务数据
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, AlertCircle, ListTodo, Bot as BotIcon, List, Kanban, CalendarRange, TableProperties, Trash2, CircleDashed,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle';
import { usePersistentToggle } from '@/shared/hooks/use-persistent-toggle';
import { PageShell } from '@/components/ui/page-shell';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import { ToolbarRow, useToolbarViews, normalizeFilterSelection } from '@/components/ui/toolbar-row';
import {
  FilterChipsRow,
  FilterCascadeMenu,
  filterConditionSets,
  matchesConditionSets,
  countBy,
  type FilterCondition,
  type FilterFieldDef,
} from '@/components/ui/filter-chips';
import { TASK_STATUS_VISUALS, TONE_TEXT_CLASS } from '@/shared/status/status-visuals';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';
import { useAllTasks, useDeleteTask, useUpdateTask } from '../hooks/use-project-tasks';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import type { Task } from '../api/issue-api';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { useTranslation } from 'react-i18next';
import { AiAssignDialog } from '../components/ai-assign-dialog';
import { TaskSimpleList } from '../components/task-simple-list';
import { TaskTableView } from '../components/task-table-view';
import { TaskGantt } from '../components/task-gantt';
import { useActiveExecutionsMap, type ActiveAiExecution } from '@/modules/execution/hooks/use-active-executions-map';
import { AiExecutionBadge } from '@/shared/components/ai-execution-badge';
import { ListActionButton } from '@/components/ui/data-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { BoardView, type BoardColumnDef } from '@/shared/components/board-view/board-view';
import { useIssueRowMenu } from '@/shared/context-menu/use-issue-row-menu';
import { cn } from '@/lib/utils';
import {
  getProjectColumns,
  getSeverityColumns,
  getTaskStatusColumns,
  taskCardRow3,
  taskCardModel,
} from '../components/board-presets';

type ViewMode = 'list' | 'board' | 'gantt' | 'table';
type GroupBy = 'none' | 'status' | 'severity' | 'project';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; dotColor: string }> = {
  critical: { label: 'Critical', color: 'text-destructive', dotColor: 'bg-destructive' },
  high: { label: 'High', color: 'text-accent-orange', dotColor: 'bg-accent-orange' },
  medium: { label: 'Medium', color: 'text-accent-yellow', dotColor: 'bg-accent-yellow' },
  low: { label: 'Low', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground/40' },
};

/** severity 缺失时从 priority 推导（任务页统一口径） */
const severityOf = (task: Task): Severity =>
  task.severity ||
  (task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low');

/** 页头实体图标：统一从 entity-icons 注册表取（规范 v0） */
const ISSUE_ENTITY = getEntityIcon('issue');

export function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [search, setSearch] = useState('');
  // 筛选条件条（Linear 形态）：字段 + 算子 + 值集，空数组 = 无筛选
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [presetAssigneeId, setPresetAssigneeId] = useState<string | undefined>(undefined);
  const [dispatchTask, setDispatchTask] = useState<{ task: Task; projectId: string } | null>(null);
  const statsCards = usePersistentToggle('tasks-page.stats');

  // Linear 风格 Display 选项
  const [orderBy, setOrderBy] = useState<string>('priority');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showSubIssues, setShowSubIssues] = useState(true);
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);
  const [displayProperties, setDisplayProperties] = useState<Record<string, boolean>>({
    id: true,
    status: true,
    assignee: true,
    priority: true,
    project: true,
    dueDate: true,
    labels: true,
    created: true,
    aiExecution: true,
  });

  const isAiFiltering = useMemo(() => {
    return conditions.some((c) => c.fieldId === 'aiExecution' && c.values.includes('active'));
  }, [conditions]);

  const toggleAiFilter = () => {
    if (isAiFiltering) {
      setConditions((prev) => prev.filter((c) => c.fieldId !== 'aiExecution'));
    } else {
      setConditions((prev) => [
        ...prev.filter((c) => c.fieldId !== 'aiExecution'),
        { id: 'cond-ai', fieldId: 'aiExecution', operator: 'is', values: ['active'] },
      ]);
    }
  };

  // 成员卡「派发任务」入口：/app/issues?state 携带 openCreate + presetAssignee。
  // 渲染期间检测 state 变化调整弹窗状态，replaceState 副作用留在独立 effect。
  const location = useLocation();
  const [prevLocationState, setPrevLocationState] = useState(location.state);
  if (prevLocationState !== location.state) {
    setPrevLocationState(location.state);
    const st = (location.state ?? {}) as { openCreate?: boolean; presetAssigneeId?: string };
    if (st.openCreate) {
      setPresetAssigneeId(st.presetAssigneeId);
      setShowCreateDialog(true);
    }
  }
  useEffect(() => {
    const st = (location.state ?? {}) as { openCreate?: boolean };
    if (st.openCreate) {
      // 清掉 state 防止刷新重复打开
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // 已保存视图：快照记忆当前页全部筛选 + 显示样式 + 分组
  const toolbar = useToolbarViews({
    key: 'tasks-page',
    defaults: [{
      id: 'all',
      name: t('task.filter.all', 'All'),
      icon: 'list',
      builtIn: true,
      snapshot: { search: '', conditions: [], viewMode: 'list', groupBy: 'none' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; conditions: FilterCondition[];
        status: string | string[]; severity: string | string[]; project: string | string[];
        viewMode: ViewMode; groupBy: GroupBy;
      }>;
      setSearch(snap.search ?? '');
      // 新快照直接恢复条件条；旧版快照（status/severity/project 数组）合成 is 条件兜底
      setConditions(Array.isArray(snap.conditions)
        ? snap.conditions
        : ([
            ['status', normalizeFilterSelection(snap.status)],
            ['severity', normalizeFilterSelection(snap.severity)],
            ['project', normalizeFilterSelection(snap.project)],
          ] as const).flatMap(([fieldId, values]) =>
            values.length > 0 ? [{ id: `legacy-${fieldId}`, fieldId, operator: 'is' as const, values }] : []),
      );
      const nextView = snap.viewMode ?? 'list';
      setViewMode(nextView);
      setGroupBy(nextView === 'board' && (snap.groupBy ?? 'none') === 'none' ? 'status' : (snap.groupBy ?? 'none'));
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, conditions, viewMode, groupBy });
  }, [updateActiveSnapshot, search, conditions, viewMode, groupBy]);

  // AI 活跃执行接管状态
  const { getIssueExecution, totalActiveAiCount } = useActiveExecutionsMap();

  // 跨项目查询所有 task + bug, 同时包含 inbox 项目下的未绑定任务
  const { data: tasksData, isLoading, refetch } = useAllTasks({ pageSize: 1000 });
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const confirmAction = useConfirm();

  // 获取项目列表用于过滤
  const { data: projectsResponse } = useProjectList();
  const projects = useMemo(() => projectsResponse?.items ?? [], [projectsResponse]);

  // Task + Bug 一起展示 (任务页 = 统一任务视图)
  const allTasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  // 筛选字段定义（级联菜单与条件条共用；hint 为各值计数）
  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const statusCounts = countBy(allTasks, (task) => task.status);
    const severityCounts = countBy(allTasks, severityOf);
    const projectCounts = countBy(allTasks, (task) => task.projectId);
    const aiActiveCounts = allTasks.filter((t) => !!getIssueExecution(t)?.isExecuting).length;

    return [
      {
        id: 'status',
        label: t('task.status.group', 'Status'),
        icon: CircleDashed,
        operators: ['is', 'isNot'],
        options: (['todo', 'in_progress', 'in_review', 'done', 'canceled'] as const).map((value) => {
          const visual = TASK_STATUS_VISUALS[value];
          const Icon = visual?.icon;
          return {
            value,
            label: t(`task.status.${value}`),
            icon: Icon ? <Icon className={`size-3.5 ${TONE_TEXT_CLASS[visual.tone]}`} /> : undefined,
            hint: statusCounts.get(value)?.toString(),
          };
        }),
      },
      {
        id: 'aiExecution',
        label: 'AI 执行态',
        icon: BotIcon,
        operators: ['is'],
        options: [
          {
            value: 'active',
            label: 'AI 接管执行中',
            hint: aiActiveCounts.toString(),
          },
        ],
      },
      {
        id: 'severity',
        label: t('task.severity.group', 'Severity'),
        icon: AlertCircle,
        operators: ['is', 'isNot'],
        options: (['critical', 'high', 'medium', 'low'] as const).map((value) => ({
          value,
          label: SEVERITY_CONFIG[value].label,
          icon: <span className={`size-2.5 shrink-0 rounded-full ${SEVERITY_CONFIG[value].dotColor}`} />,
          hint: severityCounts.get(value)?.toString(),
        })),
      },
      {
        id: 'project',
        label: t('task.filter.projectGroup', 'Project'),
        icon: getEntityIcon('project').icon,
        operators: ['is', 'isNot'],
        searchable: true,
        options: projects.map((p) => ({
          value: p.id,
          label: p.name,
          hint: projectCounts.get(p.id)?.toString(),
        })),
      },
    ];
  }, [t, projects, allTasks, getIssueExecution]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const statusSets = filterConditionSets(conditions, 'status');
    const severitySets = filterConditionSets(conditions, 'severity');
    const projectSets = filterConditionSets(conditions, 'project');
    const aiSets = filterConditionSets(conditions, 'aiExecution');

    const list = allTasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (!matchesConditionSets(task.status, statusSets)) {
        return false;
      }
      // AI 执行状态筛选
      if (aiSets.include.includes('active') && !getIssueExecution(task)?.isExecuting) {
        return false;
      }
      // 完成项显示控制
      if (completedFilter === 'active' && (task.status === 'done' || task.status === 'canceled')) {
        return false;
      }
      if (completedFilter === 'completed' && task.status !== 'done' && task.status !== 'canceled') {
        return false;
      }
      // severity 缺失时从 priority 推导（severityOf 统一口径）
      if (!matchesConditionSets(severityOf(task), severitySets)) {
        return false;
      }
      if (!matchesConditionSets(task.projectId, projectSets)) {
        return false;
      }
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      let res = 0;
      if (orderBy === 'priority') {
        const pOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        res = (pOrder[a.priority ?? 'low'] ?? 0) - (pOrder[b.priority ?? 'low'] ?? 0);
      } else if (orderBy === 'dueDate') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        res = da - db;
      } else if (orderBy === 'created') {
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        res = ca - cb;
      } else if (orderBy === 'title') {
        res = a.title.localeCompare(b.title);
      }
      return orderDirection === 'desc' ? -res : res;
    });
    return sorted;
  }, [allTasks, search, conditions, getIssueExecution, completedFilter, orderBy, orderDirection]);

  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return t('common.noProject');
    return projects.find((p) => p.id === projectId)?.name || projectId;
  };

  const handleTaskClick = (task: Task) => {
    navigate(`/app/issues/${task.id}`);
  };

  return (
    <PageShell aiPage="task.tasks-list" className="overflow-hidden">
      {/* Header */}
      <PageHeader
        aiId="task.tasks-list"
        title={t("task.title")}
        icon={ISSUE_ENTITY.icon}
        iconColor={TONE_TEXT_CLASS[ISSUE_ENTITY.tone]}
        metrics={[{ id: 'total', label: t("task.title"), value: filteredTasks.length }]}
        actions={
          <>
            <QuickCardsToggle
              visible={statsCards.visible}
              onToggle={statsCards.toggle}
              label={t('task.showStats', 'Stats')}
              activeLabel={t('task.hideStats', 'Hide stats')}
              aiId="task.tasks-list.stats-toggle"
            />
            <HeaderActionButton
              icon={Plus}
              label={t("task.create")}
              onClick={() => setShowCreateDialog(true)}
              data-ai-component="task.tasks-list.new-button"
              data-ai-action="task.tasks-list.new-button.click"
              data-ai-role="submit"
            />
          </>
        }
      />

      {/* Unified Create Dialog */}
      <UnifiedCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultType="task"
        defaultAssigneeId={presetAssigneeId}
        onSuccess={(type, id) => {
          console.log(`Created ${type} with id: ${id}`);
          refetch();
        }}
      />

      {/* AI Dispatch Dialog */}
      {dispatchTask && (
        <AiAssignDialog
          open={!!dispatchTask}
          onOpenChange={(open) => { if (!open) setDispatchTask(null); }}
          issueId={dispatchTask.task.id}
          projectId={dispatchTask.projectId}
          taskTitle={dispatchTask.task.title}
          onSuccess={() => { setDispatchTask(null); refetch(); }}
        />
      )}

      {/* Stats Cards（默认隐藏，header 幽灵按钮切换） */}
      {statsCards.visible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard
          items={[
            { key: 'total', value: (tasksData?.meta?.total ?? filteredTasks.length), label: t("task.stats.total"), icon: ListTodo, ...STATS_THEMES.blue },
            // 状态图标统一取 status-visuals.TASK_STATUS_VISUALS（唯一映射源，规范 v0 对齐）
            { key: 'todo', value: allTasks.filter(task => task.status === 'todo').length, label: t("task.stats.todo"), icon: TASK_STATUS_VISUALS.todo.icon, ...STATS_THEMES.default },
            { key: 'inProgress', value: allTasks.filter(task => task.status === 'in_progress').length, label: t("task.stats.inProgress"), icon: TASK_STATUS_VISUALS.in_progress.icon, ...STATS_THEMES.yellow },
            { key: 'inReview', value: allTasks.filter(task => task.status === 'in_review').length, label: t("task.stats.inReview") , icon: TASK_STATUS_VISUALS.in_review.icon, ...STATS_THEMES.purple },
            { key: 'done', value: allTasks.filter(task => task.status === 'done').length, label: t("task.stats.done"), icon: TASK_STATUS_VISUALS.done.icon, ...STATS_THEMES.green },
            { key: 'canceled', value: allTasks.filter(task => task.status === 'canceled').length, label: t("task.stats.canceled") , icon: TASK_STATUS_VISUALS.canceled.icon, ...STATS_THEMES.gray },
          ]}
          columns={6}
          className="grid grid-cols-6 gap-3"
        />
        </div>
      ) : null}

      {/* Toolbar: 已保存视图 + 视图样式 + 筛选/显示/下载 */}
      <ToolbarRow
        aiId="task.tasks-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        isDirty={toolbar.isDirty}
        onSaveCurrentView={toolbar.saveCurrentToActive}
        viewStyle={{
          value: viewMode,
          layout: 'centered',
          onChange: (v) => {
            setViewMode(v as ViewMode);
            // board 视图不支持 no grouping，切入时兜底为按状态分组
            if (v === 'board' && groupBy === 'none') setGroupBy('status');
          },
          options: [
            { value: 'list', label: t('task.view.list', 'List'), icon: List },
            { value: 'board', label: t('task.view.board', 'Board'), icon: Kanban },
            { value: 'gantt', label: t('task.view.gantt', 'Gantt'), icon: CalendarRange },
            { value: 'table', label: 'Table', icon: TableProperties },
          ],
        }}
        filterMenu={{
          render: () => (
            <FilterCascadeMenu
              aiId="task.tasks-list.filter-menu"
              fields={filterFields}
              conditions={conditions}
              onChange={setConditions}
              badge={conditions.filter((c) => c.values.length > 0).length}
              search={{ value: search, onChange: setSearch, placeholder: t('task.filter.searchPlaceholder') }}
            />
          ),
        }}
        actions={
          <button
            type="button"
            onClick={toggleAiFilter}
            aria-pressed={isAiFiltering}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all select-none shadow-2xs",
              isAiFiltering
                ? "border border-accent-purple bg-accent-purple text-white shadow-xs font-semibold"
                : totalActiveAiCount > 0
                  ? "border border-accent-purple/40 bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20"
                  : "border border-border/60 bg-card text-muted-foreground hover:border-accent-purple/30 hover:text-foreground",
            )}
            title={isAiFiltering ? "点击取消筛选 AI 执行任务" : "点击一键筛选正在 AI 执行的任务"}
          >
            <BotIcon className={cn("size-3.5", totalActiveAiCount > 0 && !isAiFiltering && "animate-pulse")} />
            <span>
              {totalActiveAiCount > 0 ? `${totalActiveAiCount} 个 ` : ''}AI 执行中
              {isAiFiltering ? " (已筛选)" : ""}
            </span>
          </button>
        }
        displayMenu={{
          displayConfig: {
            viewMode,
            onViewModeChange: (v) => {
              setViewMode(v as ViewMode);
              if (v === 'board' && groupBy === 'none') setGroupBy('status');
            },
            viewOptions: [
              { value: 'list', label: t('task.view.list', 'List'), icon: List },
              { value: 'board', label: t('task.view.board', 'Board'), icon: Kanban },
              { value: 'gantt', label: t('task.view.gantt', 'Gantt'), icon: CalendarRange },
              { value: 'table', label: 'Table', icon: TableProperties },
            ],
            groupBy,
            onGroupByChange: (g) => setGroupBy(g as GroupBy),
            groupByOptions: [
              ...(viewMode !== 'board' ? [{ value: 'none', label: t('task.groupBy.none', 'No grouping') }] : []),
              { value: 'status', label: t('task.groupBy.status') },
              { value: 'severity', label: t('task.groupBy.severity') },
              { value: 'project', label: t('task.groupBy.project') },
            ],
            orderBy,
            onOrderByChange: setOrderBy,
            orderDirection,
            onOrderDirectionToggle: () => setOrderDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')),
            completedFilter,
            onCompletedFilterChange: setCompletedFilter,
            showSubIssues,
            onShowSubIssuesChange: setShowSubIssues,
            showEmptyGroups,
            onShowEmptyGroupsChange: setShowEmptyGroups,
            displayProperties,
            onToggleDisplayProperty: (key) =>
              setDisplayProperties((prev) => ({ ...prev, [key]: !prev[key] })),
          },
        }}
        downloadMenu={{
          items: [
            { type: 'label', label: t('task.export.label', 'Export') },
            { id: 'csv', type: 'item', label: 'CSV', disabled: true },
            { id: 'json', type: 'item', label: 'JSON', disabled: true },
          ],
        }}
      />

      {/* 筛选条件条（Linear 形态，单开一行；有条件才占行） */}
      {conditions.length > 0 ? (
        <FilterChipsRow
          aiId="task.tasks-list.filter-chips"
          className="mx-6 mb-2 md:mx-7"
          fields={filterFields}
          conditions={conditions}
          onChange={setConditions}
          onSaveToView={() => updateActiveSnapshot({ search, conditions, viewMode, groupBy })}
          onSaveAsNewView={(name) => toolbar.createView(name)}
        />
      ) : null}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4 sm:px-8 sm:py-5 lg:px-10">
        <div className="w-full">
          {viewMode === 'list' ? (
            <TaskSimpleList
              tasks={filteredTasks}
              loading={isLoading}
              onTaskClick={handleTaskClick}
              groupBy={groupBy}
              getProjectName={getProjectName}
              getAiExecution={getIssueExecution}
              onGroupCreate={() => setShowCreateDialog(true)}
              selectionActions={(selected, close) => (
                <>
                  <ListActionButton
                    onClick={() => {
                      const first = selected.find((t) => t.projectId);
                      if (first) setDispatchTask({ task: first, projectId: first.projectId! });
                    }}
                    disabled={!selected.some((t) => t.projectId)}
                    title="指派 AI"
                    className="text-accent-purple"
                  >
                    <BotIcon className="size-3.5" /> 指派 AI
                  </ListActionButton>
                  <ListActionButton
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: `删除选中的 ${selected.length} 项？`,
                        description: '该操作会删除选中的任务及其子任务，且不可撤销。',
                        confirmText: '删除',
                        cancelText: '取消',
                        variant: 'destructive',
                      });
                      if (!ok) return;
                      await Promise.allSettled(selected.map((t) => deleteTask.mutateAsync(t.id)));
                      close();
                      refetch();
                    }}
                    title="删除"
                    className="text-destructive"
                  >
                    <Trash2 className="size-3.5" /> 删除
                  </ListActionButton>
                </>
              )}
            />
          ) : viewMode === 'board' ? (
            <TasksBoardView
              tasks={filteredTasks}
              loading={isLoading}
              groupBy={groupBy === 'none' ? 'status' : groupBy}
              projects={projects}
              onTaskClick={handleTaskClick}
              getAiExecution={getIssueExecution}
              onDispatchTask={(task, projectId) => setDispatchTask({ task, projectId })}
              onMoveTask={(task, data) => updateTask.mutate({ issueId: task.id, data })}
            />
          ) : viewMode === 'gantt' ? (
            <TaskGantt
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              getAiExecution={getIssueExecution}
              onDateRangeChange={(issueId, range) =>
                updateTask
                  .mutateAsync({
                    issueId,
                    data: {
                      startDate: range.startDate,
                      dueDate: range.dueDate,
                    },
                  })
                  .then(() => undefined)
              }
            />
          ) : (
            <TaskTableView
              tasks={filteredTasks}
              loading={isLoading}
              onTaskClick={handleTaskClick}
              getAiExecution={getIssueExecution}
              getProjectName={getProjectName}
              selectionActions={(selected, close) => (
                <>
                  <ListActionButton
                    onClick={() => {
                      const first = selected.find((t) => t.projectId);
                      if (first) setDispatchTask({ task: first, projectId: first.projectId! });
                    }}
                    disabled={!selected.some((t) => t.projectId)}
                    title="指派 AI"
                    className="text-accent-purple"
                  >
                    <BotIcon className="size-3.5" /> 指派 AI
                  </ListActionButton>
                  <ListActionButton
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: `删除选中的 ${selected.length} 项？`,
                        description: '该操作会删除选中的任务及其子任务，且不可撤销。',
                        confirmText: '删除',
                        cancelText: '取消',
                        variant: 'destructive',
                      });
                      if (!ok) return;
                      await Promise.allSettled(selected.map((t) => deleteTask.mutateAsync(t.id)));
                      close();
                      refetch();
                    }}
                    title="删除"
                    className="text-destructive"
                  >
                    <Trash2 className="size-3.5" /> 删除
                  </ListActionButton>
                </>
              )}
            />
          )}
        </div>
      </div>

      </PageShell>
  );
}

// Board View Component（基于通用 BoardView，支持状态/严重度/项目动态分组与拖拽）
function TasksBoardView({
  tasks,
  groupBy,
  projects,
  onTaskClick,
  getAiExecution,
  onDispatchTask,
  onMoveTask,
  loading,
}: {
  tasks: Task[];
  groupBy: GroupBy;
  projects: { id: string; name: string }[];
  loading?: boolean;
  onTaskClick: (task: Task) => void;
  getAiExecution?: (task: Task) => ActiveAiExecution | null;
  onDispatchTask?: (task: Task, projectId: string) => void;
  onMoveTask?: (task: Task, data: { status?: string; severity?: Task['severity'] }) => void;
}) {
  const { t } = useTranslation();
  // list 与 kanban 共享右键菜单：与 TaskSimpleList 同源构建（useIssueRowMenu 默认 task 域）
  const onItemContextMenu = useIssueRowMenu();

  const columns = useMemo<BoardColumnDef[]>(() => {
    switch (groupBy) {
      case 'status':
        return getTaskStatusColumns(t);
      case 'severity':
        return getSeverityColumns(t);
      case 'project':
        return getProjectColumns(
          t,
          projects,
          tasks.map((task) => task.projectId || 'none'),
        );
      default:
        return [{ id: 'all', title: t('task.filter.all', 'All'), icon: ListTodo, color: 'muted' }];
    }
  }, [groupBy, projects, t, tasks]);

  const groupByFn = (task: Task): string => {
    switch (groupBy) {
      case 'status':
        return task.status || 'todo';
      case 'severity':
        return task.severity || 'low';
      case 'project':
        return task.projectId || 'none';
      default:
        return 'all';
    }
  };

  // 拖拽落库：status/severity 分组直接更新对应字段；project 分组无对应更新接口，仅本地排序
  const handleItemMove =
    groupBy === 'status' || groupBy === 'severity'
      ? (task: Task, toColumnId: string) => {
          if (groupBy === 'status') {
            if (task.status !== toColumnId) onMoveTask?.(task, { status: toColumnId });
          } else if (task.severity !== toColumnId) {
            onMoveTask?.(task, { severity: toColumnId as Task['severity'] });
          }
        }
      : undefined;

  const card = {
    ...taskCardModel,
    isAiExecuting: (task: Task) => !!getAiExecution?.(task)?.isExecuting,
    aiExecutionNode: (task: Task) => {
      const ai = getAiExecution?.(task);
      if (!ai) return null;
      return <AiExecutionBadge execution={ai} size="xs" variant="line" />;
    },
    row3: (task: Task) => (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{taskCardRow3(task)}</div>
        {task.projectId && onDispatchTask ? (
          <button
            type="button"
            className="shrink-0 rounded p-1 text-accent-purple transition-colors hover:bg-accent-purple/20"
            onClick={(event) => {
              event.stopPropagation();
              onDispatchTask(task, task.projectId!);
            }}
            title={t('task.dispatchToAi')}
          >
            <BotIcon size={12} />
          </button>
        ) : null}
      </div>
    ),
  };

  return (
    <BoardView<Task>
      className="h-full"
      columns={columns}
      items={tasks}
      loading={loading}
      groupBy={groupByFn}
      card={card}
      onItemMove={handleItemMove}
      onItemClick={(task) => onTaskClick(task)}
      onItemContextMenu={onItemContextMenu}
    />
  );
}
