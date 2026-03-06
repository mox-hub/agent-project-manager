import { useState } from 'react';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';
import { Button } from '@/shared/ui/button';
import { TaskCard } from './task-card';
import type { Task, TaskListParams } from './api/task-api';

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
          padding: spacing.xl * 2,
          color: colors.textSecondary,
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
        gap: spacing.md,
        overflowX: 'auto',
        paddingBottom: spacing.md,
        minHeight: 400,
      }}
    >
      {columns.map((column) => {
        const columnTasks = getColumnTasks(column.status);
        const isOverWipLimit = column.wipLimit && columnTasks.length > column.wipLimit;
        const isDragOver = dragOverColumn === column.status;

        return (
          <div
            key={column.id}
            style={{
              minWidth: 280,
              maxWidth: 320,
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              background: colors.neutralBg,
              borderRadius: radii.lg,
              padding: spacing.sm,
              transition: 'all 0.2s ease',
              border: isDragOver ? `2px dashed ${colors.accent}` : '2px dashed transparent',
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
                padding: spacing.sm,
                marginBottom: spacing.xs,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span
                  style={{
                    fontSize: typography.sm,
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {column.title}
                </span>
                <span
                  style={{
                    fontSize: typography.xs,
                    color: isOverWipLimit ? colors.error : colors.textSecondary,
                    background: isOverWipLimit ? colors.error + '20' : colors.neutralBg,
                    padding: `2px ${spacing.xs}`,
                    borderRadius: radii.sm,
                  }}
                >
                  {columnTasks.length}
                  {column.wipLimit ? `/${column.wipLimit}` : ''}
                </span>
              </div>
              {onCreateTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCreateTask(column.status)}
                  style={{ padding: spacing.xs }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Button>
              )}
            </div>

            {/* Tasks Container */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.sm,
                overflowY: 'auto',
                padding: spacing.xs,
                minHeight: 100,
              }}
            >
              {columnTasks.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: spacing.lg,
                    color: colors.textTertiary,
                    fontSize: typography.xs,
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

            {/* Add Task Button */}
            {onCreateTask && columnTasks.length === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCreateTask(column.status)}
                style={{
                  marginTop: spacing.sm,
                  width: '100%',
                  justifyContent: 'center',
                  border: `1px dashed ${colors.border}`,
                }}
              >
                + Add Task
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
