import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
import { TaskFilterBar } from '../components/task-filter-bar';
import { TaskGantt } from '../components/task-gantt';
import { TaskImportExport } from '../components/task-import-export';
import { useProjectTasks, useMoveTask, useCreateTask } from '../hooks/use-project-tasks';
import type { Task, TaskListParams } from '../api/task-api';
import { LayoutGrid, List, Plus, Calendar } from 'lucide-react';

type ViewMode = 'board' | 'list' | 'gantt';

export function TaskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('todo');
  const [searchQuery] = useState('');
  const [filters, setFilters] = useState<TaskListParams>({});

  const { data: tasksData, isLoading } = useProjectTasks(projectId, {
    pageSize: 100,
    ...filters,
  });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();

  const filteredTasks = useMemo(() => {
    const tasks = tasksData?.data ?? [];
    let result = tasks;
    if (searchQuery) {
      result = result.filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [tasksData?.data, searchQuery]);

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
    <PageShell>
      {/* Header */}
      <div className="flex w-full shrink-0 items-center justify-between border-b border-content-border bg-content-bg px-6 py-4">
        <h1 className="m-0 text-2xl font-semibold text-content-text">Tasks</h1>
        <div className="flex items-center gap-3">
          {/* Integrated Filter Bar */}
          <TaskFilterBar
            projectId={projectId}
            initialFilters={filters}
            onChange={setFilters}
          />

          {/* View Toggle */}
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { value: 'board', label: 'Board', icon: <LayoutGrid size={14} /> },
              { value: 'list', label: 'List', icon: <List size={14} /> },
              { value: 'gantt', label: 'Timeline', icon: <Calendar size={14} /> },
            ]}
          />

          {/* Create Task Button */}
          <Button size="sm" onClick={() => handleCreateTask('todo')}>
            <Plus size={14} />
            New
          </Button>

          {/* Import/Export */}
          <TaskImportExport projectId={projectId} />
        </div>
      </div>

      {/* Content - full width for board/list */}
      <div className="flex-1 overflow-auto p-6 w-full min-w-0">
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
          />
        ) : (
          <TaskList
            tasks={filteredTasks}
            loading={isLoading}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Quick Create Modal */}
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
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
