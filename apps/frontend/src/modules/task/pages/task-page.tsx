import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { LayoutGrid, List, Plus, Calendar } from 'lucide-react';
import { FilterToolbar } from '@/shared/ui/filter-toolbar';
import { buildFilterStateFromQuery, buildQueryFromFilterState } from '@/shared/filters/adapters';
import { ProjectDetailNav } from '@/modules/project/components/dashboard/project-detail-nav';

type ViewMode = 'board' | 'list' | 'gantt';
const TASK_FILTER_KEYS = ['status', 'assigneeId', 'iterationId', 'tag'] as const;

export function TaskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  const doneTasks = filteredTasks.filter((task) => task.status === 'done').length;
  const inProgressTasks = filteredTasks.filter((task) => task.status === 'in_progress').length;
  const overdueTasks = filteredTasks.filter((task) => {
    if (!task.dueDate) return false;
    return task.status !== 'done' && new Date(task.dueDate) < new Date();
  }).length;

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    await moveTask.mutateAsync({ taskId, status: newStatus });
  };

  const handleCreateTask = (status: string) => {
    setCreateTaskStatus(status);
    setShowCreateModal(true);
  };

  const handleQuickCreate = async (title: string) => {
    if (!projectId) return;
    await createTask.mutateAsync({
      projectId,
      title,
      status: createTaskStatus,
    });
    setShowCreateModal(false);
  };

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center text-content-text-secondary">
        Project not found
      </div>
    );
  }

  return (
    <PageShell className="p-6">
      <div className="mx-auto w-full max-w-[1280px]">
        <section className="mb-4 flex items-center justify-between rounded-xl border border-content-border bg-gradient-to-r from-content-bg via-content-bg-secondary/30 to-content-bg p-4 shadow-sm">
          <div>
            <h1 className="m-0 text-2xl font-semibold text-content-text">Tasks Workspace</h1>
            <p className="mt-1 text-sm text-content-text-secondary">
              统一管理看板、列表和时间线，支持拖拽、筛选、导入导出与任务详情编辑。
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Total {filteredTasks.length}</Badge>
              <Badge variant="outline">In Progress {inProgressTasks}</Badge>
              <Badge variant="outline">Done {doneTasks}</Badge>
              <Badge variant={overdueTasks > 0 ? 'destructive' : 'outline'}>
                Overdue {overdueTasks}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => handleCreateTask('todo')}>
              <Plus size={14} />
              New Task
            </Button>
            <TaskImportExport projectId={projectId} />
          </div>
        </section>

        <ProjectDetailNav projectId={projectId} />

        <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-content-border bg-content-bg p-4">
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

          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { value: 'board', label: 'Board', icon: <LayoutGrid size={14} /> },
              { value: 'list', label: 'List', icon: <List size={14} /> },
              { value: 'gantt', label: 'Timeline', icon: <Calendar size={14} /> },
            ]}
          />
        </section>

        <div className="min-h-[520px] rounded-xl border border-content-border bg-content-bg p-4">
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
      </div>

      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const title = formData.get('title') as string;
              if (title.trim()) {
                handleQuickCreate(title.trim());
              }
            }}
          >
            <div className="py-4">
              <input
                type="text"
                name="title"
                placeholder="Task title"
                autoFocus
                className="w-full border-0 bg-transparent py-2 text-lg text-content-text placeholder:text-content-text-muted focus:outline-none"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

