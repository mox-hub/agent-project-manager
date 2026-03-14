import type { Task, TaskPriority, TaskListParams } from '@/modules/task/api/task-api';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "default",
  high: "destructive",
  critical: "destructive",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  todo: "outline",
  in_progress: "default",
  in_review: "secondary",
  done: "outline",
};

export interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  params?: TaskListParams;
  onTaskClick?: (task: Task) => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}

export function TaskList({
  tasks,
  loading,
  onTaskClick,
}: TaskListProps) {
  if (loading) {
    return (
      <div className="text-center py-16 text-content-text-secondary text-sm">
        Loading tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-content-text-tertiary text-sm">
        No tasks found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-content-border bg-content-bg-secondary">
            <th className="p-4 text-left font-medium text-content-text-tertiary w-[40%] text-xs uppercase tracking-wide">
              Title
            </th>
            <th className="p-4 text-left font-medium text-content-text-tertiary w-[15%] text-xs uppercase tracking-wide">
              Status
            </th>
            <th className="p-4 text-left font-medium text-content-text-tertiary w-[10%] text-xs uppercase tracking-wide">
              Priority
            </th>
            <th className="p-4 text-left font-medium text-content-text-tertiary w-[15%] text-xs uppercase tracking-wide">
              Assignee
            </th>
            <th className="p-4 text-left font-medium text-content-text-tertiary w-[10%] text-xs uppercase tracking-wide">
              Due Date
            </th>
            <th className="p-4 text-center font-medium text-content-text-tertiary w-[10%] text-xs uppercase tracking-wide">
              Subtasks
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const priority = (task.priority as TaskPriority) || 'medium';
            const isCompleted = task.status === 'done';
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className={cn(
                  'border-b border-content-border cursor-default transition-colors duration-100',
                  onTaskClick && 'cursor-pointer hover:bg-content-bg-secondary'
                )}
              >
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Priority indicator */}
                    <div
                      className={cn(
                        'w-[3px] h-7 rounded flex-shrink-0',
                        priority === 'low' && 'bg-accent-green',
                        priority === 'medium' && 'bg-accent-yellow',
                        (priority === 'high' || priority === 'critical') && 'bg-accent-red'
                      )}
                    />
                    <div>
                      <div className={cn(
                        'font-medium text-content-text',
                        isCompleted && 'line-through opacity-60'
                      )}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-content-text-tertiary max-w-[400px] truncate mt-1">
                          {task.description}
                        </div>
                      )}
                      {/* Tags */}
                      {task.taskTags && task.taskTags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {task.taskTags.slice(0, 3).map(({ tag }) => (
                            <span
                              key={tag.id}
                              className="px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: tag.color ? `${tag.color}20` : 'var(--color-accent-blue-light)',
                                color: tag.color || 'var(--color-accent-blue)',
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {task.taskTags.length > 3 && (
                            <span className="text-xs text-content-text-tertiary flex items-center">
                              +{task.taskTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={statusVariants[task.status as string] || "outline"}>
                    {task.status || 'todo'}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge variant={priorityVariants[priority] || "default"}>
                    {priority}
                  </Badge>
                </td>
                <td className="p-3">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent-purple-light flex items-center justify-center text-xs font-semibold text-accent-purple border border-content-border">
                        {(task.assignee.displayName || task.assignee.username)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm text-content-text">
                        {task.assignee.displayName || task.assignee.username}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-content-text-tertiary">
                      Unassigned
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {task.dueDate ? (
                    <span className={cn(
                      'text-sm flex items-center gap-1',
                      isOverdue ? 'text-accent-red' : 'text-content-text-secondary'
                    )}>
                      <Calendar size={14} />
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-sm text-content-text-tertiary">-</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {task._count?.subTasks !== undefined && task._count.subTasks > 0 ? (
                    <span className="text-sm text-content-text-secondary flex items-center justify-center gap-1">
                      <CheckSquare size={14} />
                      {task._count.subTasks}
                    </span>
                  ) : (
                    <span className="text-sm text-content-text-tertiary">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
