import { useState } from 'react';
import { notionColors, notionTypography, notionSpacing, notionRadii } from '@/shared/theme/notion-tokens';
import { Button } from '@/shared/ui/button';
import { TaskCard } from './task-card';
import type { Task, TaskListParams } from './api/task-api';
import { Plus, MoreHorizontal } from 'lucide-react';

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
  todo: notionColors.text.tertiary,
  in_progress: notionColors.accent.blue,
  in_review: notionColors.accent.purple,
  done: notionColors.accent.green,
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: notionSpacing['4xl'] * 2,
          color: notionColors.text.secondary,
          fontSize: notionTypography.fontSize.sm,
        }}
      >
        Loading tasks...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: notionSpacing.lg,
        overflowX: 'auto',
        paddingBottom: notionSpacing.md,
        minHeight: '100%',
      }}
    >
      {columns.map((column) => {
        const columnTasks = getColumnTasks(column.status);
        const isOverWipLimit = column.wipLimit && columnTasks.length > column.wipLimit;
        const isDragOver = dragOverColumn === column.status;
        const accentColor = columnAccentColors[column.status] || notionColors.text.tertiary;

        return (
          <div
            key={column.id}
            style={{
              minWidth: 280,
              maxWidth: 320,
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: notionColors.background.secondary,
              borderRadius: notionRadii.lg,
              padding: notionSpacing.sm,
              transition: 'all 0.2s ease',
              border: isDragOver ? `2px dashed ${accentColor}` : '1px solid transparent',
            }}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${notionSpacing.sm}px ${notionSpacing.xs}`,
                marginBottom: notionSpacing.xs,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: notionSpacing.sm }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: accentColor,
                  }}
                />
                <span
                  style={{
                    fontSize: notionTypography.fontSize.sm,
                    fontWeight: notionTypography.fontWeight.medium,
                    color: notionColors.text.primary,
                  }}
                >
                  {column.title}
                </span>
                <span
                  style={{
                    fontSize: notionTypography.fontSize.xs,
                    color: isOverWipLimit ? notionColors.accent.red : notionColors.text.tertiary,
                    backgroundColor: isOverWipLimit ? notionColors.accent.redLight : 'transparent',
                    padding: `${notionSpacing.xs - 2}px ${notionSpacing.sm - 2}px`,
                    borderRadius: notionRadii.sm,
                    fontWeight: notionTypography.fontWeight.medium,
                  }}
                >
                  {columnTasks.length}
                  {column.wipLimit ? `/${column.wipLimit}` : ''}
                </span>
              </div>
              {onCreateTask && (
                <button
                  onClick={() => onCreateTask(column.status)}
                  style={{
                    padding: notionSpacing.xs,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: notionColors.text.tertiary,
                    cursor: 'pointer',
                    borderRadius: notionRadii.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notionColors.background.hover;
                    e.currentTarget.style.color = notionColors.text.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = notionColors.text.tertiary;
                  }}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Tasks Container */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: notionSpacing.sm,
                overflowY: 'auto',
                padding: notionSpacing.xs,
                minHeight: 100,
              }}
            >
              {columnTasks.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: notionSpacing.xl,
                    color: notionColors.text.tertiary,
                    fontSize: notionTypography.fontSize.sm,
                  }}
                >
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    style={{
                      opacity: draggedTask?.id === task.id ? 0.5 : 1,
                    }}
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
                style={{
                  marginTop: notionSpacing.sm,
                  padding: notionSpacing.sm,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: notionColors.text.tertiary,
                  cursor: 'pointer',
                  borderRadius: notionRadii.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: notionSpacing.xs,
                  fontSize: notionTypography.fontSize.sm,
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = notionColors.background.hover;
                  e.currentTarget.style.color = notionColors.text.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = notionColors.text.tertiary;
                }}
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
