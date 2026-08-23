/**
 * ProjectTasksPage - 项目内任务页（原 Board tab）
 * 复刻全局任务页（modules/task/pages/tasks-page.tsx）的全部能力，限定当前项目：
 * 列表/看板双视图 + 筛选/分组/搜索 + 多选批量（指派 AI/删除）+ 统一创建 + Linear 同步
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bot as BotIcon,
  Kanban,
  List,
  ListTodo,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { ListActionButton } from '@/components/ui/data-list';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { toast } from '@/hooks/use-toast';
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
import { useSyncTasks } from '@/modules/linear/hooks/use-linear-sync';
import { useLinearSyncEvents } from '@/modules/linear/hooks/use-linear-events';
import {
  LinearSourceBadge,
  LinearSyncStatusBadge,
} from '@/modules/linear/components/linear-status-badge';
import {
  SyncProgressDialog,
  SyncButtonProgress,
  type SyncProgress,
} from '@/modules/linear/components/sync-progress-dialog';
import { useSyncProgress } from '@/modules/linear/hooks/use-sync-progress';

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

interface SyncSummary {
  added: number;
  updated: number;
  conflicts: number;
  errors: number;
}

export function ProjectTasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dispatchTask, setDispatchTask] = useState<Task | null>(null);

  // Linear 同步状态（原 Board 页逻辑原样迁移）
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncMinimized, setSyncMinimized] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  useLinearSyncEvents(projectId);
  const { data: project } = useProjectDetail(projectId);
  const { data: tasksData, isLoading, refetch } = useProjectTasks(projectId, { pageSize: 500 });
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const confirmAction = useConfirm();
  const syncTasks = useSyncTasks();

  const { progress, isActive } = useSyncProgress({
    projectId,
    onProgress: (p: SyncProgress) => {
      if (p.phase === 'completed') {
        setSyncCompleted(true);
        setSyncSummary(p.current >= 100 ? { added: 0, updated: 0, conflicts: 0, errors: 0 } : {
          added: Math.floor(p.current * 0.1),
          updated: Math.floor(p.current * 0.5),
          conflicts: 0,
          errors: 0,
        });
      }
    },
    onCompleted: (result) => {
      if (result.summary) {
        setSyncSummary(result.summary);
      }
      setSyncCompleted(true);
      // Auto close dialog after 2 seconds
      setTimeout(() => {
        if (!syncMinimized) {
          setSyncDialogOpen(false);
        }
        setSyncMinimized(false);
        setSyncCompleted(false);
      }, 2000);
    },
  });

  const isLinearLinked = project?.externalProvider === 'linear';

  const handleSync = useCallback(() => {
    if (!projectId) return;

    setSyncCompleted(false);
    setSyncSummary(null);
    setSyncMinimized(false);
    setSyncDialogOpen(true);

    syncTasks.mutate(
      { projectId, direction: 'two-way' },
      {
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Sync failed',
            description: err instanceof Error ? err.message : 'Unknown error',
          });
          setSyncDialogOpen(false);
        },
      },
    );
  }, [projectId, syncTasks]);

  const handleMinimizeDialog = useCallback(() => {
    setSyncMinimized(true);
    setSyncDialogOpen(false);
  }, []);

  // 已保存视图：每项目独立快照（key 含 projectId）
  const toolbar = useToolbarViews({
    key: `project-tasks:${projectId}`,
    defaults: [{
      id: 'all',
      name: t('task.filter.all', 'All'),
      icon: 'list',
      builtIn: true,
      snapshot: { search: '', status: 'all', severity: 'all', viewMode: 'board', groupBy: 'none' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; status: TaskStatus | 'all'; severity: Severity | 'all';
        viewMode: ViewMode; groupBy: GroupBy;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilter(snap.status ?? 'all');
      setSeverityFilter(snap.severity ?? 'all');
      setViewMode(snap.viewMode ?? 'board');
      setGroupBy(snap.groupBy ?? 'none');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, severity: severityFilter, viewMode, groupBy });
  }, [updateActiveSnapshot, search, statusFilter, severityFilter, viewMode, groupBy]);

  const filteredTasks = useMemo(() => {
    const allTasks = tasksData?.data ?? [];
    return allTasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      // Use severity from task if available, otherwise derive from priority
      const taskSeverity = task.severity || (task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low') as Severity;
      if (severityFilter !== 'all' && taskSeverity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [tasksData?.data, search, statusFilter, severityFilter]);

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
      title="Tasks"
      hideHeader
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
            onChange: (v) => setViewMode(v as ViewMode),
            options: [
              { value: 'list', label: t('task.view.list', 'List'), icon: List },
              { value: 'board', label: t('task.view.board', 'Board'), icon: Kanban },
            ],
          }}
          filterMenu={{
            badge: [statusFilter !== 'all', severityFilter !== 'all'].filter(Boolean).length,
            search: { value: search, onChange: setSearch, placeholder: t('task.filter.searchPlaceholder') },
            items: [
              { type: 'label', label: t('task.status.group', 'Status') },
              ...(['all', 'todo', 'in_progress', 'in_review', 'done', 'canceled'] as const).map((value) => ({
                id: `status-${value}`,
                type: 'checkbox' as const,
                label: value === 'all' ? t('task.status.all') : t(`task.status.${value}`),
                checked: statusFilter === value,
                onSelect: () => setStatusFilter(value),
              })),
              { type: 'separator' },
              { type: 'label', label: t('task.severity.group', 'Severity') },
              ...(['all', 'critical', 'high', 'medium', 'low'] as const).map((value) => ({
                id: `severity-${value}`,
                type: 'checkbox' as const,
                label: value === 'all' ? t('task.filter.all', 'All') : SEVERITY_LABELS[value],
                checked: severityFilter === value,
                onSelect: () => setSeverityFilter(value),
              })),
            ],
          }}
          displayMenu={{
            items: [
              { type: 'label', label: t('task.groupBy.label', 'Group by') },
              { id: 'groupby-none', type: 'checkbox', label: t('task.groupBy.none', 'No grouping'), checked: groupBy === 'none', onSelect: () => setGroupBy('none') },
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
            ...(isLinearLinked
              ? [{
                  id: 'project.project-board.linear-sync',
                  icon: RefreshCw,
                  label: 'Sync Linear',
                  render: () => (
                    <span
                      className="flex items-center gap-1.5"
                      data-ai-component="project.project-board.linear-status"
                      data-ai-role="status"
                    >
                      <LinearSourceBadge source="linear" />
                      <LinearSyncStatusBadge status={project?.syncStatus} />
                      <SyncButtonProgress
                        isPending={syncTasks.isPending || isActive}
                        progress={progress}
                        onClick={handleSync}
                        disabled={false}
                      />
                    </span>
                  ),
                }]
              : []),
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
                    await Promise.allSettled(selected.map((task) => deleteTask.mutateAsync(task.id)));
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
          <ProjectTasksBoard
            tasks={filteredTasks}
            loading={isLoading}
            groupBy={groupBy}
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

      {/* Sync Progress Dialog */}
      <SyncProgressDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        progress={progress}
        isCompleted={syncCompleted}
        summary={syncSummary ?? undefined}
        onMinimize={handleMinimizeDialog}
      />
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
