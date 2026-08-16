import type { Task, TaskPriority, TaskListParams } from '@/modules/task/api/task-api';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckSquare, Calendar } from 'lucide-react';
import { LinearExternalRefBadge } from '@/modules/linear/components/linear-status-badge';
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
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
        <Spinner />
        <span>Loading tasks...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No tasks found
      </div>
    );
  }

  return (
    <Table className="text-sm">
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
            <TableHead className="p-4 text-left font-medium text-muted-foreground w-[40%] text-xs uppercase tracking-wide">
              Title
            </TableHead>
            <TableHead className="p-4 text-left font-medium text-muted-foreground w-[15%] text-xs uppercase tracking-wide">
              Status
            </TableHead>
            <TableHead className="p-4 text-left font-medium text-muted-foreground w-[10%] text-xs uppercase tracking-wide">
              Priority
            </TableHead>
            <TableHead className="p-4 text-left font-medium text-muted-foreground w-[15%] text-xs uppercase tracking-wide">
              Assignee
            </TableHead>
            <TableHead className="p-4 text-left font-medium text-muted-foreground w-[10%] text-xs uppercase tracking-wide">
              Due Date
            </TableHead>
            <TableHead className="p-4 text-center font-medium text-muted-foreground w-[10%] text-xs uppercase tracking-wide">
              Subtasks
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const priority = (task.priority as TaskPriority) || 'medium';
            const isCompleted = task.status === 'done';
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

            return (
              <TableRow
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className={cn(
                  'border-b border-border cursor-default transition-colors duration-100',
                  onTaskClick && 'cursor-pointer hover:bg-muted/50'
                )}
              >
                <TableCell className="p-3">
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
                        'flex items-center gap-1.5',
                        'font-medium text-foreground',
                        isCompleted && 'line-through opacity-60'
                      )}>
                        <span className="truncate">{task.title}</span>
                        {task.externalIdentifier ? (
                          <LinearExternalRefBadge
                            identifier={task.externalIdentifier}
                            url={task.externalUrl}
                          />
                        ) : null}
                      </div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground max-w-[400px] truncate mt-1">
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
                            <span className="text-xs text-muted-foreground flex items-center">
                              +{task.taskTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="p-3">
                  <Badge variant={statusVariants[task.status as string] || "outline"}>
                    {task.status || 'todo'}
                  </Badge>
                </TableCell>
                <TableCell className="p-3">
                  <Badge variant={priorityVariants[priority] || "default"}>
                    {priority}
                  </Badge>
                </TableCell>
                <TableCell className="p-3">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent-purple-light flex items-center justify-center text-xs font-semibold text-accent-purple border border-border">
                        {(task.assignee.displayName || task.assignee.username)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm text-foreground">
                        {task.assignee.displayName || task.assignee.username}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                <TableCell className="p-3">
                  {task.dueDate ? (
                    <span className={cn(
                      'text-sm flex items-center gap-1',
                      isOverdue ? 'text-accent-red' : 'text-muted-foreground'
                    )}>
                      <Calendar size={14} />
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="p-3 text-center">
                  {task._count?.subTasks !== undefined && task._count.subTasks > 0 ? (
                    <span className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <CheckSquare size={14} />
                      {task._count.subTasks}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
  );
}
