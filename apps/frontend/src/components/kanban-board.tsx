// KanbanBoard placeholder component - to be replaced with proper implementation later
import React from 'react';

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
}

export interface KanbanItem {
  id: string;
  columnId: string;
  title?: string;
  description?: string;
  priority?: string;
  assignee?: unknown;
  dueDate?: string;
  // Extended properties for project-board
  name?: string;
  healthScore?: number;
  memberCount?: number;
  createdAt?: string;
  type?: string;
  visibility?: string;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onItemMove?: (itemId: string, newColumnId: string) => void;
  onItemClick?: (item: KanbanItem) => void;
  renderItem?: (item: KanbanItem) => React.ReactNode;
  className?: string;
}

export function KanbanBoard({
  columns,
  items,
  onItemMove,
  onItemClick,
  renderItem,
  className = '',
}: KanbanBoardProps) {
  return (
    <div className={`p-4 ${className}`}>
      <div className="text-center text-muted-foreground py-8">
        Kanban Board - To be implemented
      </div>
    </div>
  );
}
