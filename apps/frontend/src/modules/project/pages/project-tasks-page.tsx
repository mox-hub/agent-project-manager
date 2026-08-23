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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolbarRow, useToolbarViews, normalizeFilterSelection, toggleFilterValue } from '@/components/ui/toolbar-row';
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

export function ProjectTasksPage() {  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  // 默认即 board 视图：board 不支持 no grouping，默认按状态分组
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [search, setSearch] = useState('');
  // Filter 多选（空数组 = 该维度不做筛选）
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [severityFilters, setSeverityFilters] = useState<string[]>([]);
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
      snapshot: { search: '', status: [], severity: [], viewMode: 'board', groupBy: 'status' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; status: string | string[]; severity: string | string[];
        viewMode: ViewMode; groupBy: GroupBy;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilters(normalizeFilterSelection(snap.status));
      setSeverityFilters(normalizeFilterSelection(snap.severity));
      const nextView = snap.viewMode ?? 'board';
      setViewMode(nextView);
      setGroupBy(nextView === 'board' && (snap.groupBy ?? 'none') === 'none' ? 'status' : (snap.groupBy ?? 'none'));
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilters, severity: severityFilters, viewMode, groupBy });
  }, [updateActiveSnapshot, search, statusFilters, severityFilters, viewMode, groupBy]);

  // 同路由在两个项目间切换（组件不卸载）时，按新项目的激活视图快照重置筛选
  const [prevProjectId, setPrevProjectId] = useState(projectId);
  if (prevProjectId !== projectId) {
    setPrevProjectId(projectId);
    const next = toolbar.views.find((v) => v.id === toolbar.activeViewId) ?? toolbar.views[0];
    const snap = (next?.snapshot ?? {}) as Partial<{
      search: string; status: string | string[]; severity: string | string[];
      viewMode: ViewMode; groupBy: GroupBy;
    }>;
    setSearch(snap.search ?? '');
    setStatusFilters(normalizeFilterSelection(snap.status));
    setSeverityFilters(normalizeFilterSelection(snap.severity));
    const nextView = snap.viewMode ?? 'board';
    setViewMode(nextView);
    setGroupBy(nextView === 'board' && (snap.groupBy ?? 'none') === 'none' ? 'status' : (snap.groupBy ?? 'none'));
  }

  const filteredTasks = useMemo(() => {
    const allTasks = tasksData?.data ?? [];
    return allTasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilters.length > 0 && !statusFilters.includes(task.status)) {
        return false;
      }
      // Use severity from task if available, otherwise derive from priority
      const taskSeverity = task.severity || (task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low') as Severity;
      if (severityFilters.length > 0 && !severityFilters.includes(taskSeverity)) {
        return false;
      }
      return true;
    });
  }, [tasksData?.data, search, statusFilters, severityFilters]);

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
            badge: [statusFilters.length > 0, severityFilters.length > 0].filter(Boolean).length,
            search: { value: search, onChange: setSearch, placeholder: t('task.filter.searchPlaceholder') },
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
              { id: 'severity-all', type: 'checkbox', label: t('task.filter.all', 'All'), checked: severityFilters.length === 0, onSelect: () => setSeverityFilters([]) },
              ...(['critical', 'high', 'medium', 'low'] as const).map((value) => ({
                id: `severity-${value}`,
                type: 'checkbox' as const,
                label: SEVERITY_LABELS[value],
                checked: severityFilters.includes(value),
                onSelect: () => setSeverityFilters((prev) => toggleFilterValue(prev, value)),
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
            onMoveTask={(task, data) => updateTask.mutate({ taskId: task.id, data })}
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
          taskId={dispatchTask.id}
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
