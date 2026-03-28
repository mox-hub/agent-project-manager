import { useState } from 'react';
import type { Task, TaskPriority } from '@/modules/task/api/task-api';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Calendar, MessageSquare, Paperclip, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityBorderColors: Record<TaskPriority, string> = {
  low: 'border-l-accent-green',
  medium: 'border-l-accent-yellow',
  high: 'border-l-accent-red',
  critical: 'border-l-accent-red',
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  todo: "outline",
  in_progress: "default",
  in_review: "secondary",
  done: "outline",
};

export interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (status: string) => void;
  draggable?: boolean;
}

export function TaskCard({ task, onClick, draggable = false }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const priority = (task.priority as TaskPriority) || 'medium';

  const isCompleted = task.status === 'done';
  const hasSubTasks = task._count?.subTasks && task._count.subTasks > 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      draggable={draggable}
      onClick={onClick}
      className={cn(
        'relative p-3 rounded-md border border-border bg-background cursor-default transition-all duration-150',
        onClick && 'cursor-pointer hover:border-muted-foreground hover:bg-muted/50',
        isCompleted && 'opacity-70',
        priorityBorderColors[priority] || 'border-l-accent-yellow'
      )}
      style={{ borderLeftWidth: 3 }}
    >
      {/* Title */}
      <div
        className={cn(
          'text-sm font-medium text-foreground mb-2 leading-normal',
          isCompleted && 'line-through'
        )}
      >
        {task.title}
      </div>

      {/* Description preview */}
      {task.description && (
        <div className="text-xs text-muted-foreground mb-3 overflow-hidden text-ellipsis line-clamp-2">
          {task.description}
        </div>
      )}

      {/* Tags */}
      {task.taskTags && task.taskTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.taskTags.map(({ tag }) => (
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
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {/* Status badge */}
        <Badge variant={statusVariants[task.status as string] || "outline"}>
          {task.status || 'todo'}
        </Badge>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Comments count */}
          {task._count?.comments !== undefined && task._count.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {task._count.comments}
            </span>
          )}

          {/* Attachments count */}
          {task._count?.attachments !== undefined && task._count.attachments > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={12} />
              {task._count.attachments}
            </span>
          )}

          {/* Subtasks count */}
          {hasSubTasks && (
            <button
              onClick={toggleExpand}
              className="flex items-center gap-1 border-none bg-transparent cursor-pointer p-0 text-muted-foreground hover:text-muted-foreground"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <CheckSquare size={12} />
              {task._count?.subTasks}
              {isExpanded ? ' (展开)' : ''}
            </button>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span className={cn('flex items-center gap-1', isOverdue && 'text-accent-red')}>
              <Calendar size={12} />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}

          {/* Assignee avatar */}
          {task.assignee && (
            <div
              className="w-5 h-5 rounded-full bg-accent-purple-light flex items-center justify-center text-xs font-semibold text-accent-purple border border-border"
              title={task.assignee.displayName || task.assignee.username}
            >
              {(task.assignee.displayName || task.assignee.username)?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
