import { useMemo } from 'react';
import { KanbanBoard, type KanbanColumn, type KanbanItem } from '@/components/kanban-board';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/modules/task/api/task-api';

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
  in_progress: 'bg-blue-500',
  in_review: 'bg-purple-500',
  done: 'bg-emerald-500',
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

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1">
            <Badge variant={priorityVariants[task.priority] || "default"}>
              {task.priority || 'medium'}
            </Badge>
          </div>
        </div>
        <h4 className="line-clamp-2 text-sm font-medium text-content-text">
          {task.title}
        </h4>
        {task.dueDate && (
          <div className="text-xs text-content-text-secondary">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-content-text-secondary">
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
        className="h-full min-h-[500px]"
      />
    </div>
  );
}
