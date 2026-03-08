import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskListParams>({});

  const { data: tasksData, isLoading } = useProjectTasks(projectId, {
    pageSize: 100,
    ...filters,
  });
  const moveTask = useMoveTask();
  const createTask = useCreateTask();

  const tasks = tasksData?.data || [];

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      result = result.filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [tasks, searchQuery]);

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
    <div className="flex h-full flex-col bg-content-bg">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-content-border bg-content-bg px-6 py-4">
        <h1 className="m-0 text-2xl font-semibold text-content-text">Tasks</h1>
        <div className="flex items-center gap-3">
          {/* Integrated Filter Bar */}
          <TaskFilterBar
            projectId={projectId}
            initialFilters={filters}
            onChange={setFilters}
          />

          {/* View Toggle */}
          <div className="inline-flex overflow-hidden rounded-md border border-content-border">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'board'
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-content-text-secondary hover:bg-content-bg-secondary'
              }`}
            >
              <LayoutGrid size={14} />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-content-text-secondary hover:bg-content-bg-secondary'
              }`}
            >
              <List size={14} />
              List
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'gantt'
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-content-text-secondary hover:bg-content-bg-secondary'
              }`}
            >
              <Calendar size={14} />
              Timeline
            </button>
          </div>

          {/* Create Task Button */}
          <Button size="sm" onClick={() => handleCreateTask('todo')}>
            <Plus size={14} />
            New
          </Button>

          {/* Import/Export */}
          <TaskImportExport projectId={projectId} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'board' ? (
          <TaskBoard
            projectId={projectId}
            tasks={filteredTasks}
            loading={isLoading}
            onTaskClick={handleTaskClick}
            onTaskMove={handleTaskMove}
            onCreateTask={handleCreateTask}
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
    </div>
  );
}
