/**
 * TasksPage - 全局任务管理页面
 * 使用真实 API 获取任务数据
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Circle, Loader, AlertCircle, CheckCircle2, XCircle,
  ListTodo, Bot as BotIcon, List, Kanban, Trash2, CircleDashed, FolderOpen,
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
import { ListActionButton } from '@/components/ui/data-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { BoardView, type BoardColumnDef } from '@/shared/components/board-view/board-view';
import { useIssueRowMenu } from '@/shared/context-menu/use-issue-row-menu';
import {
  getProjectColumns,
  getSeverityColumns,
  getTaskStatusColumns,
  taskCardRow3,
  taskCardModel,
} from '../components/board-presets';

type ViewMode = 'list' | 'board';
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

  // 跨项目查询所有 task + bug, 同时包含 inbox 项目下的未绑定任务
  const { data: tasksData, isLoading, refetch } = useAllTasks({ pageSize: 1000 });
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const confirmAction = useConfirm();

  // 获取项目列表用于过滤
  const { data: projectsResponse } = useProjectList();
  const projects = projectsResponse?.items ?? [];

  // Task + Bug 一起展示 (任务页 = 统一任务视图)
  const allTasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  // 筛选字段定义（级联菜单与条件条共用；hint 为各值计数）
  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const statusCounts = countBy(allTasks, (task) => task.status);
    const severityCounts = countBy(allTasks, severityOf);
    const projectCounts = countBy(allTasks, (task) => task.projectId);
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
        icon: FolderOpen,
        operators: ['is', 'isNot'],
        searchable: true,
        options: projects.map((p) => ({
          value: p.id,
          label: p.name,
          hint: projectCounts.get(p.id)?.toString(),
        })),
      },
    ];
  }, [t, projects, allTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const statusSets = filterConditionSets(conditions, 'status');
    const severitySets = filterConditionSets(conditions, 'severity');
    const projectSets = filterConditionSets(conditions, 'project');
    return allTasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (!matchesConditionSets(task.status, statusSets)) {
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
  }, [allTasks, search, conditions]);

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
            { key: 'todo', value: allTasks.filter(task => task.status === 'todo').length, label: t("task.stats.todo"), icon: Circle, ...STATS_THEMES.default },
            { key: 'inProgress', value: allTasks.filter(task => task.status === 'in_progress').length, label: t("task.stats.inProgress"), icon: Loader, ...STATS_THEMES.yellow },
            { key: 'inReview', value: allTasks.filter(task => task.status === 'in_review').length, label: t("task.stats.inReview") , icon: AlertCircle, ...STATS_THEMES.purple },
            { key: 'done', value: allTasks.filter(task => task.status === 'done').length, label: t("task.stats.done"), icon: CheckCircle2, ...STATS_THEMES.green },
            { key: 'canceled', value: allTasks.filter(task => task.status === 'canceled').length, label: t("task.stats.canceled") , icon: XCircle, ...STATS_THEMES.gray },
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
          ) : (
            <TasksBoardView
              tasks={filteredTasks}
              loading={isLoading}
              groupBy={groupBy === 'none' ? 'status' : groupBy}
              projects={projects}
              onTaskClick={handleTaskClick}
              onDispatchTask={(task, projectId) => setDispatchTask({ task, projectId })}
              onMoveTask={(task, data) => updateTask.mutate({ issueId: task.id, data })}
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
  onDispatchTask,
  onMoveTask,
  loading,
}: {
  tasks: Task[];
  groupBy: GroupBy;
  projects: { id: string; name: string }[];
  loading?: boolean;
  onTaskClick: (task: Task) => void;
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
