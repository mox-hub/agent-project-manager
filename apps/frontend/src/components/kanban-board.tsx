import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { moveItemBetweenColumns, reorderColumns, reorderItemsWithinColumn } from "@/components/kanban-board.utils";

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  wipLimit?: number;
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
  enableColumnReorder?: boolean;
  onColumnReorder?: (columns: KanbanColumn[]) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  renderColumnHeader?: (column: KanbanColumn, count: number) => React.ReactNode;
  emptyColumnState?: React.ReactNode;
  className?: string;
}

export function KanbanBoard({
  columns,
  items,
  onItemMove,
  onItemClick,
  renderItem,
  enableColumnReorder = false,
  onColumnReorder,
  onDragStart,
  onDragEnd,
  renderColumnHeader,
  emptyColumnState,
  className = '',
}: KanbanBoardProps) {
  const [orderedColumns, setOrderedColumns] = useState(columns);
  const [localItems, setLocalItems] = useState(items);

  useEffect(() => {
    setOrderedColumns(columns);
  }, [columns]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemMap = useMemo(() => {
    const grouped = new Map<string, KanbanItem[]>();
    for (const column of orderedColumns) {
      grouped.set(column.id, []);
    }
    for (const item of localItems) {
      if (!grouped.has(item.columnId)) {
        grouped.set(item.columnId, []);
      }
      grouped.get(item.columnId)?.push(item);
    }
    return grouped;
  }, [orderedColumns, localItems]);

  const findItem = (itemId: string) => localItems.find((item) => item.id === itemId);

  const handleDragStart = (event: DragStartEvent) => {
    onDragStart?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      onDragEnd?.(event);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "column" && overData?.type === "column" && enableColumnReorder) {
      const nextColumns = reorderColumns(orderedColumns, String(active.id), String(over.id));
      if (nextColumns !== orderedColumns) {
        setOrderedColumns(nextColumns);
        onColumnReorder?.(nextColumns);
      }
      onDragEnd?.(event);
      return;
    }

    const activeItem = findItem(String(active.id));
    if (!activeItem) {
      onDragEnd?.(event);
      return;
    }

    const overColumnId = overData?.type === "column" ? String(over.id) : String(overData?.columnId ?? "");
    const overItemId = overData?.type === "item" ? String(over.id) : null;
    if (!overColumnId) {
      onDragEnd?.(event);
      return;
    }

    const nextItems = [...localItems];
    const sourceIndex = nextItems.findIndex((item) => item.id === activeItem.id);
    if (sourceIndex === -1) {
      onDragEnd?.(event);
      return;
    }

    const sourceItem = nextItems[sourceIndex];
    const sourceColumnId = sourceItem.columnId;

    if (sourceColumnId === overColumnId && overItemId) {
      const reordered = reorderItemsWithinColumn(nextItems, sourceColumnId, sourceItem.id, overItemId);
      if (reordered !== nextItems) {
        setLocalItems(reordered);
      }
      onDragEnd?.(event);
      return;
    }

    const moved = moveItemBetweenColumns(nextItems, sourceItem.id, overColumnId);
    if (moved === nextItems) {
      onDragEnd?.(event);
      return;
    }
    setLocalItems(moved);
    if (sourceColumnId !== overColumnId) {
      onItemMove?.(sourceItem.id, overColumnId);
    }
    onDragEnd?.(event);
  };

  const renderCard = (item: KanbanItem) => (
    <button
      type="button"
      className="w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50"
      onClick={() => onItemClick?.(item)}
    >
      {renderItem ? (
        renderItem(item)
      ) : (
        <div className="space-y-2">
          <h4 className="line-clamp-2 text-sm font-medium text-foreground">{item.title ?? item.name}</h4>
          {item.priority ? <StatusPill tone="info">{item.priority}</StatusPill> : null}
        </div>
      )}
    </button>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("h-full overflow-x-auto p-4", className)}>
        <SortableContext items={orderedColumns.map((column) => column.id)} strategy={rectSortingStrategy}>
          <div className="grid min-w-[860px] grid-cols-4 gap-4">
            {orderedColumns.map((column) => (
              <KanbanColumnView
                key={column.id}
                column={column}
                items={itemMap.get(column.id) ?? []}
                renderHeader={renderColumnHeader}
                emptyColumnState={emptyColumnState}
                renderCard={renderCard}
                enableColumnDrag={enableColumnReorder}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </DndContext>
  );
}

interface KanbanColumnViewProps {
  column: KanbanColumn;
  items: KanbanItem[];
  renderHeader?: (column: KanbanColumn, count: number) => React.ReactNode;
  emptyColumnState?: React.ReactNode;
  renderCard: (item: KanbanItem) => React.ReactNode;
  enableColumnDrag: boolean;
}

function KanbanColumnView({
  column,
  items,
  renderHeader,
  emptyColumnState,
  renderCard,
  enableColumnDrag,
}: KanbanColumnViewProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
    disabled: !enableColumnDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-h-[460px] flex-col rounded-lg border border-border bg-muted/40 p-3",
        isDragging && "opacity-70",
      )}
    >
      <div
        className={cn("mb-3 flex items-center justify-between", enableColumnDrag && "cursor-grab")}
        {...attributes}
        {...listeners}
      >
        {renderHeader ? (
          renderHeader(column, items.length)
        ) : (
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", column.color ?? "bg-accent-blue")} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{column.title}</h3>
            <StatusPill>{items.length}</StatusPill>
          </div>
        )}
        {typeof column.wipLimit === "number" ? (
          <span className="text-[10px] text-muted-foreground">WIP {items.length}/{column.wipLimit}</span>
        ) : null}
      </div>

      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {items.map((item) => (
            <KanbanItemView key={item.id} item={item}>
              {renderCard(item)}
            </KanbanItemView>
          ))}
          {items.length === 0 ? (
            <div
              className="flex h-full min-h-[140px] items-center justify-center rounded-md border border-dashed border-border"
              data-column-id={column.id}
            >
              {emptyColumnState ?? <EmptyState title="暂无卡片" description="拖拽卡片到此列" className="w-full border-0 p-3" />}
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanItemView({ item, children }: { item: KanbanItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", columnId: item.columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-60")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
