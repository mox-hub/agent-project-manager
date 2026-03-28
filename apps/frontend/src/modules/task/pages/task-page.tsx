import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { TaskBoard } from '../components/task-board';
import { TaskDetailDrawer } from '../components/task-detail-drawer';
import { TaskList } from '../components/task-list';
import { TaskGantt } from '../components/task-gantt';
import { TaskImportExport } from '../components/task-import-export';
import {
  useProjectTasks,
  useMoveTask,
  useCreateTask,
  useUpdateTask,
} from '../hooks/use-project-tasks';
import { useTaskFilterOptions } from '../hooks/use-task-filter-options';
import type { Task, TaskListParams } from '../api/task-api';
import { Plus } from 'lucide-react';
import { FilterToolbar } from '@/shared/ui/filter-toolbar';
import { buildFilterStateFromQuery, buildQueryFromFilterState } from '@/shared/filters/adapters';
import { ProjectDetailNav } from '@/modules/project/components/dashboard/project-detail-nav';
import { ViewSwitcher } from '@/components/view-switcher';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';

type ViewMode = 'board' | 'list' | 'gantt';
const TASK_FILTER_KEYS = ['status', 'assigneeId', 'iterationId', 'tag'] as const;

export function TaskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [quickCreateTitle, setQuickCreateTitle] = useState('');
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('todo');
  const [filters, setFilters] = useState<TaskListParams>({});
  const taskFilterGroups = useTaskFilterOptions(projectId);

  const { data: tasksData, isLoading } = useProjectTasks(projectId, {
    pageSize: 100,
    ...filters,
  });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

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
        description={`${filteredTasks.length} tasks`}
        actions={(
          <>
            <TaskImportExport projectId={projectId} />
            <Button
              size="sm"
              className="h-9 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90"
              onClick={() => handleCreateTask('todo')}
              data-ai-component="task.task-workspace.header.new-task-button"
              data-ai-action="task.task-workspace.header.new-task-button.click"
              data-ai-role="submit"
            >
              <Plus size={14} />
              New Task
            </Button>
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

        <section
          className="mb-3 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-background p-4"
          data-ai-component="task.task-workspace.context-bar"
          data-ai-role="filter"
        >
          <FilterToolbar
            className="min-w-[420px] flex-1"
            searchValue={filters.q ?? ''}
            searchPlaceholder="Search tasks..."
            onSearchChange={(value) => {
              const selectedFilters = buildFilterStateFromQuery(
                filters.filters,
                TASK_FILTER_KEYS,
              );
              setFilters(
                buildQueryFromFilterState<NonNullable<TaskListParams['filters']>>(
                  {
                    q: value || undefined,
                    page: 1,
                    pageSize: filters.pageSize,
                  },
                  selectedFilters,
                  TASK_FILTER_KEYS,
                ),
              );
            }}
            groups={taskFilterGroups}
            selectedFilters={buildFilterStateFromQuery(filters.filters, TASK_FILTER_KEYS)}
            onFilterChange={(filterId, value) => {
              const nextState = {
                ...buildFilterStateFromQuery(filters.filters, TASK_FILTER_KEYS),
                [filterId]: value,
              };
              setFilters(
                buildQueryFromFilterState<NonNullable<TaskListParams['filters']>>(
                  {
                    q: filters.q,
                    page: 1,
                    pageSize: filters.pageSize,
                  },
                  nextState,
                  TASK_FILTER_KEYS,
                ),
              );
            }}
          />

          <ViewSwitcher
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
            modes={['board', 'list', 'gantt']}
            className="rounded-full border-border bg-background"
          />
        </section>

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
              <TaskList
                tasks={filteredTasks}
                loading={isLoading}
                onTaskClick={handleTaskClick}
              />
            )}
          </div>

          <div className="space-y-3">
            <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
