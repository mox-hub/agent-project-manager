import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AttentionRail } from '@/components/ui/attention-rail';
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
      <div className="flex h-full items-center justify-center text-content-text-secondary">
        Project not found
      </div>
    );
  }

  return (
    <PageShell className="p-6" aiPage={CORE_AI_PAGE_IDS.taskWorkspace}>
      <div className="mx-auto w-full max-w-[1280px]">
        <section
          className="mb-4 flex items-center justify-between rounded-xl border border-content-border bg-gradient-to-r from-content-bg via-content-bg-secondary/30 to-content-bg p-4 shadow-sm motion-enter"
          data-ai-component="task.task-workspace.header"
          data-ai-role="content"
        >
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
            <Button
              size="sm"
              onClick={() => handleCreateTask('todo')}
              data-ai-component="task.task-workspace.header.new-task-button"
              data-ai-action="task.task-workspace.header.new-task-button.click"
              data-ai-role="submit"
            >
              <Plus size={14} />
              New Task
            </Button>
            <TaskImportExport projectId={projectId} />
          </div>
        </section>

        {showCreateInline ? (
          <section
            className="mb-4 rounded-xl border border-content-border bg-content-bg p-4 motion-enter"
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

        <ProjectDetailNav projectId={projectId} />

        <section
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-content-border bg-content-bg p-4"
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

        <section className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div
            className="min-h-[520px] rounded-xl border border-content-border bg-content-bg p-4"
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
            <AttentionRail
              aiPrefix="task.task-workspace"
              items={[
                {
                  id: 'project-dashboard',
                  title: '返回项目仪表盘',
                  description: '查看健康度、AI 风险与集成状态',
                  to: `/app/projects/${projectId}`,
                },
                {
                  id: 'project-settings',
                  title: '打开项目设置',
                  description: '管理成员、里程碑与自动化配置',
                  to: `/app/projects/${projectId}/settings`,
                },
              ]}
            />
            <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
