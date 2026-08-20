import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { TaskBoard } from '../components/task-board';
import { TaskDetailDrawer } from '../components/task-detail-drawer';
import { TaskSimpleList } from '../components/task-simple-list';
import { TaskGantt } from '../components/task-gantt';
import { TaskImportExport } from '../components/task-import-export';
import { BatchCreateTasksDialog } from '../components/batch-create-tasks-dialog';
import {
  useProjectTasks,
  useMoveTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '../hooks/use-project-tasks';
import { useTaskFilterOptions } from '../hooks/use-task-filter-options';
import type { Task, TaskListParams } from '../api/task-api';
import { Plus, CheckSquare, ListPlus, Kanban, List, CalendarRange, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ListActionButton } from '@/components/ui/data-list';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { buildFilterStateFromQuery, buildQueryFromFilterState } from '@/shared/filters/adapters';
import type { FilterState } from '@/shared/filters/types';
import { ProjectDetailNav } from '@/modules/project/components/dashboard/project-detail-nav';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { UnifiedCreateDialog } from '@/components/ui/unified-create-dialog';
import { useConfirm } from '@/shared/confirm/use-confirm';

type ViewMode = 'board' | 'list' | 'gantt';
const TASK_FILTER_KEYS = ['status', 'assigneeId', 'iterationId', 'tag'] as const;

export function TaskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [showBatchCreate, setShowBatchCreate] = useState(false);
  const [showUnifiedCreate, setShowUnifiedCreate] = useState(false);
  const [quickCreateTitle, setQuickCreateTitle] = useState('');
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('todo');
  const [filters, setFilters] = useState<TaskListParams>({});
  const taskFilterGroups = useTaskFilterOptions(projectId);

  const searchValue = filters.q ?? '';
  const selectedFilters = useMemo(
    () => buildFilterStateFromQuery(filters.filters, TASK_FILTER_KEYS),
    [filters.filters],
  );

  // 已保存视图：快照记忆搜索/多选筛选/视图样式
  const toolbar = useToolbarViews({
    key: 'task-workspace',
    defaults: [{
      id: 'all',
      name: t('task.filter.all', 'All'),
      icon: 'board',
      builtIn: true,
      snapshot: { search: '', filters: {}, viewStyle: 'board' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; filters: FilterState; viewStyle: ViewMode;
      }>;
      setViewMode(snap.viewStyle ?? 'board');
      setFilters(
        buildQueryFromFilterState<NonNullable<TaskListParams['filters']>>(
          { q: snap.search || undefined, page: 1, pageSize: filters.pageSize },
          snap.filters ?? {},
          TASK_FILTER_KEYS,
        ),
      );
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search: searchValue, filters: selectedFilters, viewStyle: viewMode });
  }, [updateActiveSnapshot, searchValue, selectedFilters, viewMode]);

  const { data: tasksData, isLoading } = useProjectTasks(projectId, {
    pageSize: 100,
    ...filters,
  });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const confirmAction = useConfirm();
  const queryClient = useQueryClient();
  const filteredTasks = tasksData?.data ?? [];
  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    await moveTask.mutateAsync({ taskId, status: newStatus });
  };

  const handleCreateTask = (status: string) => {
    setCreateTaskStatus(status);
    setShowCreateInline(true);
  };

  const handleQuickCreate = async (title: string) => {
    if (!projectId) return;
    await createTask.mutateAsync({
      projectId,
      title,
      status: createTaskStatus,
    });
    setShowCreateInline(false);
    setQuickCreateTitle('');
  };

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.taskWorkspace}>
      <PageHeader
        aiId="task.task-workspace"
        title="Tasks Workspace"
        metrics={[{ id: 'total', label: 'Tasks', value: filteredTasks.length }]}
        icon={CheckSquare}
        iconColor="text-accent-blue"
        actions={(
          <>
            <TaskImportExport projectId={projectId} />
            <HeaderActionButton
              variant="outline"
              icon={ListPlus}
              label="Batch Create"
              onClick={() => setShowBatchCreate(true)}
            />
            <HeaderActionButton
              icon={Plus}
              label="Create"
              onClick={() => setShowUnifiedCreate(true)}
              data-ai-component="task.task-workspace.header.new-task-button"
              data-ai-action="task.task-workspace.header.new-task-button.click"
              data-ai-role="submit"
            />
          </>
        )}
      />

      <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden px-6 pb-5 pt-3 md:px-7">
        <div className="mb-3">
          <ProjectDetailNav projectId={projectId} />
        </div>
        {showCreateInline ? (
          <section
            className="mb-3 rounded-[var(--radius)] border border-border bg-muted/50 p-4 motion-enter"
            data-ai-component="task.task-workspace.inline-create"
            data-ai-role="panel"
          >
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const title = quickCreateTitle.trim();
                if (title) {
                  handleQuickCreate(title);
                }
              }}
            >
              <Input
                type="text"
                value={quickCreateTitle}
                onChange={(e) => setQuickCreateTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
                className="h-9 flex-1 min-w-[260px]"
                data-ai-component="task.task-workspace.inline-create.title-input"
                data-ai-action="task.task-workspace.inline-create.title-input.change"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateInline(false);
                  setQuickCreateTitle('');
                }}
                data-ai-component="task.task-workspace.inline-create.cancel"
                data-ai-action="task.task-workspace.inline-create.cancel.click"
                data-ai-role="jump"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || !quickCreateTitle.trim()}
                data-ai-component="task.task-workspace.inline-create.submit"
                data-ai-action="task.task-workspace.inline-create.submit.click"
                data-ai-role="submit"
              >
                {createTask.isPending ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </section>
        ) : null}

        <ToolbarRow
          aiId="task.task-workspace"
          className="mb-3 px-0 md:px-0"
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
              { value: 'board', label: t('task.view.board', 'Board'), icon: Kanban },
              { value: 'list', label: t('task.view.list', 'List'), icon: List },
              { value: 'gantt', label: t('task.view.gantt', 'Gantt'), icon: CalendarRange },
            ],
          }}
          filterMenu={{
            badge: Object.values(selectedFilters).reduce((count, values) => count + (values?.length ?? 0), 0),
            search: {
              value: searchValue,
              onChange: (value) => {
                setFilters(
                  buildQueryFromFilterState<NonNullable<TaskListParams['filters']>>(
                    { q: value || undefined, page: 1, pageSize: filters.pageSize },
                    selectedFilters,
                    TASK_FILTER_KEYS,
                  ),
                );
              },
              placeholder: 'Search tasks...',
            },
            items: taskFilterGroups.flatMap((group, groupIndex) => [
              ...(groupIndex > 0 ? [{ type: 'separator' as const }] : []),
              { type: 'label' as const, label: group.label },
              ...group.options.map((option) => ({
                id: `${group.id}-${option.id}`,
                type: 'checkbox' as const,
                label: option.label,
                checked: selectedFilters[group.id]?.includes(option.id) ?? false,
                onSelect: () => {
                  const current = selectedFilters[group.id] ?? [];
                  const next = current.includes(option.id)
                    ? current.filter((value) => value !== option.id)
                    : [...current, option.id];
                  setFilters(
                    buildQueryFromFilterState<NonNullable<TaskListParams['filters']>>(
                      { q: filters.q, page: 1, pageSize: filters.pageSize },
                      { ...selectedFilters, [group.id]: next.length > 0 ? next : undefined },
                      TASK_FILTER_KEYS,
                    ),
                  );
                },
              })),
            ]),
          }}
          displayMenu={false}
          downloadMenu={{
            items: [
              { type: 'label', label: t('task.export.label', 'Export') },
              { id: 'csv', type: 'item', label: 'CSV', disabled: true },
              { id: 'json', type: 'item', label: 'JSON', disabled: true },
            ],
          }}
        />

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div
            className="min-h-[520px] rounded-[var(--radius)] border border-border bg-background p-4"
            data-ai-component="task.task-workspace.primary-content"
            data-ai-role="content"
          >
            {viewMode === 'board' ? (
              <TaskBoard
                projectId={projectId}
                tasks={filteredTasks}
                loading={isLoading}
                onTaskClick={handleTaskClick}
                onTaskMove={handleTaskMove}
                onCreateTask={handleCreateTask}
                columns={[
                  { id: 'todo', title: 'To Do', status: 'todo' },
                  { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
                  { id: 'in_review', title: 'In Review', status: 'in_review' },
                  { id: 'done', title: 'Done', status: 'done' },
                ]}
              />
            ) : viewMode === 'gantt' ? (
              <TaskGantt
                tasks={filteredTasks}
                onTaskClick={handleTaskClick}
                onDateRangeChange={(taskId, range) =>
                  updateTask
                    .mutateAsync({
                      taskId,
                      data: {
                        startDate: range.startDate,
                        dueDate: range.dueDate,
                      },
                    })
                    .then(() => undefined)
                }
              />
            ) : (
              <TaskSimpleList
                tasks={filteredTasks}
                loading={isLoading}
                onTaskClick={handleTaskClick}
                groupBy="status"
                getProjectName={() => ''}
                onGroupCreate={(key) => handleCreateTask(key)}
                selectionActions={(selected, close) => (
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
                      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
                    }}
                    title="删除"
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" /> 删除
                  </ListActionButton>
                )}
              />
            )}
          </div>

          <div className="space-y-3">
            <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
          </div>
        </section>
      </div>
      <BatchCreateTasksDialog
        open={showBatchCreate}
        onOpenChange={setShowBatchCreate}
        projectId={projectId}
      />
      <UnifiedCreateDialog
        open={showUnifiedCreate}
        onOpenChange={setShowUnifiedCreate}
        defaultType="task"
        projectId={projectId}
        onSuccess={(type, id) => {
          console.log(`Created ${type} with id: ${id}`);
        }}
      />
    </PageShell>
  );
}
