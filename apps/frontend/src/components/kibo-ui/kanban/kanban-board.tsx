"use client";

import * as React from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
}

export interface KanbanItem {
  id: string;
  columnId?: string;
  [key: string]: unknown;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onItemMove?: (itemId: string, newColumnId: string) => void;
  onItemClick?: (item: KanbanItem) => void;
  renderItem?: (item: KanbanItem) => React.ReactNode;
  className?: string;
}

function KanbanColumnComponent({
  column,
  items,
  renderItem,
  onItemClick,
}: {
  column: KanbanColumn;
  items: KanbanItem[];
  renderItem?: (item: KanbanItem) => React.ReactNode;
  onItemClick?: (item: KanbanItem) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isOver,
  } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const defaultColors: Record<string, string> = {
    todo: "bg-zinc-400",
    in_progress: "bg-blue-500",
    in_review: "bg-purple-500",
    done: "bg-emerald-500",
    active: "bg-emerald-500",
    archived: "bg-zinc-400",
    on_hold: "bg-amber-500",
  };

  const columnColor = column.color || defaultColors[column.id] || "bg-zinc-400";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col w-72 min-w-72 h-full rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800",
        isOver && "ring-2 ring-blue-500/50"
      )}
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 p-3 cursor-grab active:cursor-grabbing"
      >
        <div className={cn("w-3 h-3 rounded-full", columnColor)} />
        <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 flex-1">
          {column.title}
        </h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      {/* Items Container */}
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {items.map((item) => {
            const {
              setNodeRef,
              attributes,
              listeners,
              transform,
              transition,
              isDragging,
            } = useSortable({
              id: item.id,
              data: {
                type: "item",
                item,
              },
            });

            const itemStyle = {
              transform: CSS.Transform.toString(transform),
              transition,
            };

            return (
              <div
                ref={setNodeRef}
                style={itemStyle}
                {...attributes}
                {...listeners}
                onClick={() => onItemClick?.(item)}
                key={item.id}
                className={cn(
                  "bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow",
                  isDragging && "opacity-50 ring-2 ring-blue-500"
                )}
              >
                {renderItem ? renderItem(item) : null}
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              No items
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  columns,
  items,
  onItemMove,
  onItemClick,
  renderItem,
  className,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getItemsByColumn = (columnId: string) => {
    return items.filter((item) => (item.columnId as string) === columnId);
  };

  const findColumn = (id: UniqueIdentifier): string | undefined => {
    const item = items.find((item) => item.id === id);
    if (item && item.columnId) {
      return item.columnId as string;
    }
    return columns.find((col) => col.id === id)?.id;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const activeColumnId = findColumn(activeId);
    const overColumnId = findColumn(overIdStr);

    if (activeColumnId && overColumnId && onItemMove) {
      if (activeColumnId !== overColumnId) {
        onItemMove(activeIdStr, overColumnId);
      }
    }

    setActiveId(null);
  };

  const activeItem = activeId
    ? items.find((item) => item.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("flex gap-3 h-full overflow-x-auto p-2", className)}>
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            items={getItemsByColumn(column.id)}
            renderItem={renderItem}
            onItemClick={onItemClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem && renderItem && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 shadow-xl opacity-90">
            {renderItem(activeItem)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
