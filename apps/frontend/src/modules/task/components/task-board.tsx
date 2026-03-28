import { useMemo } from 'react';
import { KanbanBoard, type KanbanColumn, type KanbanItem } from '@/components/kanban-board';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/modules/task/api/task-api';
import { CalendarClock, Sparkles, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "default",
  high: "destructive",
  critical: "destructive",
};

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
  onCreateTask?: (_status: string) => void;
}

const columnAccentColors: Record<string, string> = {
  todo: 'bg-zinc-400',
  in_progress: 'bg-sky-500',
  in_review: 'bg-amber-500',
  done: 'bg-emerald-500',
};

const columnTheme: Record<string, { edge: string; halo: string; badge: string; dot: string }> = {
  todo: {
    edge: 'border-zinc-400/40',
    halo: 'from-zinc-400/20 to-transparent',
    badge: 'bg-zinc-500/15 text-zinc-300',
    dot: 'bg-zinc-400',
  },
  in_progress: {
    edge: 'border-sky-400/50',
    halo: 'from-sky-500/25 to-transparent',
    badge: 'bg-sky-500/15 text-sky-300',
    dot: 'bg-sky-400',
  },
  in_review: {
    edge: 'border-amber-400/50',
    halo: 'from-amber-500/25 to-transparent',
    badge: 'bg-amber-500/15 text-amber-300',
    dot: 'bg-amber-400',
  },
  done: {
    edge: 'border-emerald-400/50',
    halo: 'from-emerald-500/25 to-transparent',
    badge: 'bg-emerald-500/15 text-emerald-300',
    dot: 'bg-emerald-400',
  },
};

export function TaskBoard({
  tasks,
  columns,
  loading,
  onTaskClick,
  onTaskMove,
}: TaskBoardProps) {
  // Transform tasks to KanbanItem format
  const kanbanItems: KanbanItem[] = useMemo(() => {
    return tasks.map((task) => ({
      id: task.id,
      columnId: task.status || 'todo',
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
    }));
  }, [tasks]);

  // Transform columns to KanbanColumn format
  const kanbanColumns: KanbanColumn[] = useMemo(() => {
    return columns.map((col) => ({
      id: col.status,
      title: col.title,
      color: columnAccentColors[col.status],
    }));
  }, [columns]);

  const handleItemMove = (itemId: string, newColumnId: string) => {
    if (onTaskMove) {
      onTaskMove(itemId, newColumnId);
    }
  };

  const handleItemClick = (item: KanbanItem) => {
    const task = tasks.find((t) => t.id === item.id);
    if (task && onTaskClick) {
      onTaskClick(task);
    }
  };

  // Render task card content
  const renderTaskCard = (item: KanbanItem) => {
    const task = tasks.find((t) => t.id === item.id);
    if (!task) return null;

    const columnStyle = columnTheme[item.columnId] || columnTheme.todo;

    return (
      <div className={cn('relative space-y-2 overflow-hidden rounded-lg border p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md', columnStyle.edge)}>
        <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b opacity-80', columnStyle.halo)} />
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', columnStyle.dot)} />
            <Badge variant={priorityVariants[task.priority] || "default"} className="capitalize">
              {task.priority || 'medium'}
            </Badge>
          </div>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium', columnStyle.badge)}>
            <Sparkles size={10} />
            {item.columnId.replace('_', ' ')}
          </span>
        </div>
        <h4 className="relative line-clamp-2 text-sm font-medium leading-relaxed text-foreground">
          {task.title}
        </h4>
        <div className="relative flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {task.dueDate ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-muted-foreground">No due date</span>
          )}
          <span className="inline-flex items-center gap-1">
            <UserRound size={12} />
            {task.assignee?.displayName || 'Unassigned'}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <KanbanBoard
        columns={kanbanColumns}
        items={kanbanItems}
        onItemMove={handleItemMove}
        onItemClick={handleItemClick}
        renderItem={renderTaskCard}
        renderColumnHeader={(column, count) => {
          const style = columnTheme[column.id] || columnTheme.todo;
          return (
            <div className="flex w-full items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} />
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{column.title}</h3>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', style.badge)}>{count}</span>
            </div>
          );
        }}
        className="h-full min-h-[500px]"
      />
    </div>
  );
}
