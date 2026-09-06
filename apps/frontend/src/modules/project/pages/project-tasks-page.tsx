/**
 * ProjectTasksPage - 项目内任务页（原 Board tab）
 * 复刻全局任务页（modules/task/pages/tasks-page.tsx）的全部能力，限定当前项目：
 * 列表/看板双视图 + 筛选/分组/搜索 + 多选批量（指派 AI/删除）+ 统一创建
 * （Linear 同步 UI/逻辑已上移至 shell 层 ProjectContextBar，全项目 tab 可用）
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bot as BotIcon,
  Kanban,
  List,
  ListTodo,
  Plus,
  Trash2,
  CircleDashed,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { ListActionButton } from '@/components/ui/data-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useProjectDetail } from '../hooks/use-project-detail';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import {
  useDeleteTask,
  useProjectTasks,
  useUpdateTask,
} from '@/modules/task/hooks/use-project-tasks';
import type { Task } from '@/modules/task/api/task-api';
import { AiAssignDialog } from '@/modules/task/components/ai-assign-dialog';
import { TaskSimpleList } from '@/modules/task/components/task-simple-list';
import { BoardView, type BoardColumnDef } from '@/shared/components/board-view/board-view';
import {
  getSeverityColumns,
  getTaskStatusColumns,
  taskCardModel,
  taskCardRow3,
} from '@/modules/task/components/board-presets';
import { useLinearSyncEvents } from '@/modules/linear/hooks/use-linear-events';

type ViewMode = 'list' | 'board';
type GroupBy = 'none' | 'status' | 'severity';
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-destructive',
  high: 'bg-accent-orange',
  medium: 'bg-accent-yellow',
  low: 'bg-muted-foreground/40',
};

/** severity 缺失时从 priority 推导（项目任务页统一口径） */
const severityOf = (task: Task): Severity =>
  task.severity ||
  (task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low');

/** 新快照直接恢复条件条；旧版快照（status/severity 数组）合成 is 条件兜底 */
function restoreConditions(snap: {
  conditions?: FilterCondition[];
  status?: string | string[];
  severity?: string | string[];
}): FilterCondition[] {
  if (Array.isArray(snap.conditions)) return snap.conditions;
  return ([
    ['status', normalizeFilterSelection(snap.status)],
    ['severity', normalizeFilterSelection(snap.severity)],
  ] as const).flatMap(([fieldId, values]) =>
    values.length > 0 ? [{ id: `legacy-${fieldId}`, fieldId, operator: 'is' as const, values }] : [],
  );
}

export function ProjectTasksPage() {  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  // 默认即 board 视图：board 不支持 no grouping，默认按状态分组
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [search, setSearch] = useState('');
  // 筛选条件条（Linear 形态）：字段 + 算子 + 值集，空数组 = 无筛选
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dispatchTask, setDispatchTask] = useState<Task | null>(null);

  useLinearSyncEvents(projectId);
  const { data: project } = useProjectDetail(projectId);
  const { data: tasksData, isLoading, refetch } = useProjectTasks(projectId, { pageSize: 500 });
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const confirmAction = useConfirm();

  // 已保存视图：每项目独立快照（key 含 projectId）
  const toolbar = useToolbarViews({
    key: `project-tasks:${projectId}`,
    defaults: [{
      id: 'all',
      name: t('task.filter.all', 'All'),
      icon: 'list',
      builtIn: true,
      snapshot: { search: '', conditions: [], viewMode: 'board', groupBy: 'status' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; conditions: FilterCondition[];
        status: string | string[]; severity: string | string[];
        viewMode: ViewMode; groupBy: GroupBy;
      }>;
      setSearch(snap.search ?? '');
      setConditions(restoreConditions(snap));
      const nextView = snap.viewMode ?? 'board';
      setViewMode(nextView);
      setGroupBy(nextView === 'board' && (snap.groupBy ?? 'none') === 'none' ? 'status' : (snap.groupBy ?? 'none'));
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, conditions, viewMode, groupBy });
  }, [updateActiveSnapshot, search, conditions, viewMode, groupBy]);

  // 同路由在两个项目间切换（组件不卸载）时，按新项目的激活视图快照重置筛选
  const [prevProjectId, setPrevProjectId] = useState(projectId);
  if (prevProjectId !== projectId) {
    setPrevProjectId(projectId);
    const next = toolbar.views.find((v) => v.id === toolbar.activeViewId) ?? toolbar.views[0];
    const snap = (next?.snapshot ?? {}) as Partial<{
      search: string; conditions: FilterCondition[];
      status: string | string[]; severity: string | string[];
      viewMode: ViewMode; groupBy: GroupBy;
    }>;
    setSearch(snap.search ?? '');
    setConditions(restoreConditions(snap));
    const nextView = snap.viewMode ?? 'board';
    setViewMode(nextView);
    setGroupBy(nextView === 'board' && (snap.groupBy ?? 'none') === 'none' ? 'status' : (snap.groupBy ?? 'none'));
  }

  const filteredTasks = useMemo(() => {
    const allTasks = tasksData?.data ?? [];
    const statusSets = filterConditionSets(conditions, 'status');
    const severitySets = filterConditionSets(conditions, 'severity');
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
      return true;
    });
  }, [tasksData?.data, search, conditions]);

  // 筛选字段定义（级联菜单与条件条共用；hint 为各值计数）
  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const tasks = tasksData?.data ?? [];
    const statusCounts = countBy(tasks, (task) => task.status);
    const severityCounts = countBy(tasks, severityOf);
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
        icon: AlertTriangle,
        operators: ['is', 'isNot'],
        options: (['critical', 'high', 'medium', 'low'] as const).map((value) => ({
          value,
          label: SEVERITY_LABELS[value],
          icon: <span className={`size-2.5 shrink-0 rounded-full ${SEVERITY_DOT[value]}`} />,
          hint: severityCounts.get(value)?.toString(),
        })),
      },
    ];
  }, [t, tasksData?.data]);

  const handleTaskClick = (task: Task) => {
    navigate(`/app/tasks/${task.id}`);
  };

  if (!projectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Project not found.
      </div>
    );
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectBoard}
      projectId={projectId}
      projectName={project?.name}
      title={t('project.detail.tasks')}
      description={t('project.detail.taskCountDesc', { count: tasksData?.data?.length ?? 0 })}
      hideBreadcrumb
      contextBar={
        <>
          <ToolbarRow
            aiId={CORE_AI_PAGE_IDS.projectBoard}
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
                  aiId={`${CORE_AI_PAGE_IDS.projectBoard}.filter-menu`}
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
              ...(['status', 'severity'] as const).map((value) => ({
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
          extraActions={[
            {
              id: 'project.project-board.header.new-task',
              icon: Plus,
              label: t('task.create'),
              onClick: () => setShowCreateDialog(true),
            },
          ]}
          />
          {/* 筛选条件条（Linear 形态，单开一行；有条件才占行） */}
          {conditions.length > 0 ? (
            <FilterChipsRow
              aiId={`${CORE_AI_PAGE_IDS.projectBoard}.filter-chips`}
              className="mx-6 mb-2 md:mx-7"
              fields={filterFields}
              conditions={conditions}
              onChange={setConditions}
              onSaveToView={() => updateActiveSnapshot({ search, conditions, viewMode, groupBy })}
              onSaveAsNewView={(name) => toolbar.createView(name)}
            />
          ) : null}
        </>
      }
    >
      <section data-ai-component="project.project-board.primary-content" data-ai-role="content">
        {viewMode === 'list' ? (
          <TaskSimpleList
            tasks={filteredTasks}
            loading={isLoading}
            onTaskClick={handleTaskClick}
            groupBy={groupBy}
            onGroupCreate={() => setShowCreateDialog(true)}
            selectionActions={(selected, close) => (
              <>
                <ListActionButton
                  onClick={() => {
                    const [first] = selected;
                    if (first) setDispatchTask(first);
                  }}
                  disabled={selected.length === 0}
                  title={t('task.dispatchToAi')}
                  className="text-accent-purple"
                >
                  <BotIcon className="size-3.5" /> {t('task.dispatchToAi')}
                </ListActionButton>
                <ListActionButton
                  onClick={async () => {
                    const ok = await confirmAction({
                      title: t('task.selection.confirmTitle', { count: selected.length }),
                      description: t('task.selection.confirmDescription'),
                      confirmText: t('task.selection.confirmText'),
                      cancelText: t('task.selection.cancelText'),
                      variant: 'destructive',
                    });
                    if (!ok) return;
                    await Promise.allSettled(selected.map((task) => deleteTask.mutateAsync(task.id)));
                    close();
                    refetch();
                  }}
                  title={t('task.selection.confirmText')}
                  className="text-destructive"
                >
                  <Trash2 className="size-3.5" /> {t('task.selection.confirmText')}
                </ListActionButton>
              </>
            )}
          />
        ) : (
          <ProjectTasksBoard
            tasks={filteredTasks}
            loading={isLoading}
            groupBy={groupBy === 'none' ? 'status' : groupBy}
            onTaskClick={handleTaskClick}
            onDispatchTask={(task) => setDispatchTask(task)}
            onMoveTask={(task, data) => updateTask.mutate({ issueId: task.id, data })}
          />
        )}
      </section>

      {/* Unified Create Dialog */}
      <UnifiedCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultType="task"
        projectId={projectId}
        onSuccess={() => refetch()}
      />

      {/* AI Dispatch Dialog */}
      {dispatchTask && projectId ? (
        <AiAssignDialog
          open={!!dispatchTask}
          onOpenChange={(open) => { if (!open) setDispatchTask(null); }}
          issueId={dispatchTask.id}
          projectId={projectId}
          taskTitle={dispatchTask.title}
          onSuccess={() => { setDispatchTask(null); refetch(); }}
        />
      ) : null}
    </ProjectDetailFrame>
  );
}

// Board View（基于通用 BoardView，状态/严重度列分组与拖拽落库；项目内无需 project 分组）
function ProjectTasksBoard({
  tasks,
  loading,
  groupBy,
  onTaskClick,
  onDispatchTask,
  onMoveTask,
}: {
  tasks: Task[];
  loading?: boolean;
  groupBy: GroupBy;
  onTaskClick: (task: Task) => void;
  onDispatchTask: (task: Task) => void;
  onMoveTask: (task: Task, data: { status?: string; severity?: Task['severity'] }) => void;
}) {
  const { t } = useTranslation();

  const columns = useMemo<BoardColumnDef[]>(() => {
    switch (groupBy) {
      case 'status':
        return getTaskStatusColumns(t);
      case 'severity':
        return getSeverityColumns(t);
      default:
        return [{ id: 'all', title: t('task.filter.all', 'All'), icon: ListTodo, color: 'muted' }];
    }
  }, [groupBy, t]);

  const groupByFn = (task: Task): string => {
    switch (groupBy) {
      case 'status':
        return task.status || 'todo';
      case 'severity':
        return task.severity || 'low';
      default:
        return 'all';
    }
  };

  // 拖拽落库：状态/严重度分组直接更新对应字段
  const handleItemMove =
    groupBy === 'status' || groupBy === 'severity'
      ? (task: Task, toColumnId: string) => {
          if (groupBy === 'status') {
            if (task.status !== toColumnId) onMoveTask(task, { status: toColumnId });
          } else if (task.severity !== toColumnId) {
            onMoveTask(task, { severity: toColumnId as Task['severity'] });
          }
        }
      : undefined;

  const card = {
    ...taskCardModel,
    row3: (task: Task) => (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{taskCardRow3(task)}</div>
        <button
          type="button"
          className="shrink-0 rounded p-1 text-accent-purple transition-colors hover:bg-accent-purple/20"
          onClick={(event) => {
            event.stopPropagation();
            onDispatchTask(task);
          }}
          title={t('task.dispatchToAi')}
        >
          <BotIcon size={12} />
        </button>
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
      onItemClick={onTaskClick}
    />
  );
}
