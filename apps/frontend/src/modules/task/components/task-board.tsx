import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from './task-card';
import type { Task, TaskListParams } from '@/modules/task/api/task-api';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskBoardColumn {
  id: string;
  title: string;
  status: string;
  wipLimit?: number;
}

export interface TaskBoardProps {
  projectId: string;
  tasks: Task[];
  columns: TaskBoardColumn[];
  loading?: boolean;
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: string) => void;
  onCreateTask?: (status: string) => void;
  params?: TaskListParams;
}

const defaultColumns: TaskBoardColumn[] = [
  { id: 'todo', title: 'To Do', status: 'todo' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
  { id: 'in_review', title: 'In Review', status: 'in_review' },
  { id: 'done', title: 'Done', status: 'done' },
];

const columnAccentColors: Record<string, string> = {
  todo: 'bg-content-text-tertiary',
  in_progress: 'bg-accent-blue',
  in_review: 'bg-accent-purple',
  done: 'bg-accent-green',
};

const columnBorderColors: Record<string, string> = {
  todo: 'border-content-text-tertiary',
  in_progress: 'border-accent-blue',
  in_review: 'border-accent-purple',
  done: 'border-accent-green',
};

export function TaskBoard({
  tasks,
  columns = defaultColumns,
  loading,
  onTaskClick,
  onTaskMove,
  onCreateTask,
}: TaskBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== newStatus && onTaskMove) {
      onTaskMove(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getColumnTasks = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16 text-content-text-secondary text-sm">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 min-h-full">
      {columns.map((column) => {
        const columnTasks = getColumnTasks(column.status);
        const isOverWipLimit = column.wipLimit && columnTasks.length > column.wipLimit;
        const isDragOver = dragOverColumn === column.status;
        const accentColorClass = columnAccentColors[column.status] || 'bg-content-text-tertiary';
        const borderColorClass = columnBorderColors[column.status] || 'border-content-text-tertiary';

        return (
          <div
            key={column.id}
            className={cn(
              'min-w-[280px] max-w-[320px] flex-0 flex flex-col rounded-lg p-2 transition-all',
              'bg-content-bg-secondary',
              isDragOver ? `border-2 border-dashed ${borderColorClass}` : 'border border-transparent'
            )}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', accentColorClass)} />
                <span className="text-sm font-medium text-content-text">
                  {column.title}
                </span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded font-medium',
                    isOverWipLimit ? 'bg-accent-red-light text-accent-red' : 'text-content-text-tertiary'
                  )}
                >
                  {columnTasks.length}
                  {column.wipLimit ? `/${column.wipLimit}` : ''}
                </span>
              </div>
              {onCreateTask && (
                <button
                  onClick={() => onCreateTask(column.status)}
                  className="p-1 border-none bg-transparent text-content-text-tertiary cursor-pointer rounded hover:bg-content-bg hover:text-content-text flex items-center justify-center transition-colors"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Tasks Container */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto p-1 min-h-[100px]">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-content-text-tertiary text-sm">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    className={cn(draggedTask?.id === task.id && 'opacity-50')}
                  >
                    <TaskCard
                      task={task}
                      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
                      draggable
                    />
                  </div>
                ))
              )}
            </div>

            {/* Add Task Button at bottom */}
            {onCreateTask && (
              <button
                onClick={() => onCreateTask(column.status)}
                className="mt-2 p-2 border-none bg-transparent text-content-text-tertiary cursor-pointer rounded-md flex items-center justify-center gap-1 text-sm hover:bg-content-bg hover:text-content-text-secondary transition-colors w-full"
              >
                <Plus size={14} />
                Add task
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
