import { useState, useMemo } from 'react';
import { KanbanBoard, type KanbanColumn, type KanbanItem } from '@/components/kibo-ui/kanban';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Task } from '@/modules/task/api/task-api';
import { Plus, GripVertical } from 'lucide-react';
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
  onCreateTask,
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
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
          {task.title}
        </h4>
        {task.dueDate && (
          <div className="text-xs text-zinc-500">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16 text-zinc-500 text-sm">
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
