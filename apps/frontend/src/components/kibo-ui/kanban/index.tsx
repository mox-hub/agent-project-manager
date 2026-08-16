"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type KanbanItem = {
  id: string;
  name: string;
  column: string;
  [key: string]: unknown;
};

export type KanbanColumn = {
  id: string;
  name: string;
  color?: string;
};

type KanbanContextValue = {
  columns: KanbanColumn[];
  data: KanbanItem[];
  activeCardId: string | null;
};

const KanbanContext = createContext<KanbanContextValue>({
  columns: [],
  data: [],
  activeCardId: null,
});

const useKanban = () => useContext(KanbanContext);

export type KanbanBoardProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export const KanbanBoard = ({ id, children, className }: KanbanBoardProps) => {
  const { isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        "flex min-w-[280px] max-w-[320px] flex-col rounded-lg border bg-muted/30",
        isOver && "bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  );
};

export type KanbanCardProps = {
  id: string;
  name: string;
  column: string;
  children?: ReactNode;
  className?: string;
};

export const KanbanCard = ({
  id,
  name,
  children,
  className,
}: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transition,
    transform,
    isDragging,
  } = useSortable({ id });

  const { activeCardId } = useKanban();

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(
          "cursor-grab touch-none p-3 shadow-sm transition-shadow hover:shadow-md",
          isDragging && "opacity-50 shadow-md",
          className
        )}
      >
        {children ?? <p className="font-medium">{name}</p>}
      </Card>

      {activeCardId === id && (
        <Card className="pointer-events-none absolute inset-0 p-3 opacity-80">
          {children ?? <p className="font-medium">{name}</p>}
        </Card>
      )}
    </div>
  );
};

export type KanbanCardsProps = {
  children: (item: KanbanItem) => ReactNode;
  id: string;
  className?: string;
};

export const KanbanCards = ({ children, className, id }: KanbanCardsProps) => {
  const { data } = useKanban();
  const filteredData = useMemo(
    () => data.filter((item) => item.column === id),
    [data, id]
  );

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="flex flex-col gap-2 p-2">
        <SortableContext items={filteredData.map((item) => item.id)}>
          {filteredData.map((item) => children(item))}
        </SortableContext>
      </div>
    </ScrollArea>
  );
};

export type KanbanHeaderProps = {
  children: ReactNode;
  className?: string;
};

export const KanbanHeader = ({ children, className }: KanbanHeaderProps) => (
  <div className={cn("flex items-center justify-between border-b p-3", className)}>
    {children}
  </div>
);

export type KanbanProviderProps = {
  children: (column: KanbanColumn) => ReactNode;
  className?: string;
  columns: KanbanColumn[];
  data: KanbanItem[];
  onDataChange?: (data: KanbanItem[]) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
};

export function KanbanProvider({
  children,
  className,
  columns,
  data,
  onDataChange,
  onDragStart,
  onDragEnd,
  onDragOver,
}: KanbanProviderProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = data.find((item) => item.id === event.active.id);
      if (card) {
        setActiveCardId(event.active.id as string);
      }
      onDragStart?.(event);
    },
    [data, onDragStart]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeItem = data.find((item) => item.id === active.id);
      const overItem = data.find((item) => item.id === over.id);

      if (!activeItem) return;

      const activeColumn = activeItem.column;
      const overColumn =
        overItem?.column ||
        columns.find((col) => col.id === over.id)?.id ||
        columns[0]?.id;

      if (activeColumn !== overColumn) {
        const newData = data.map((item) =>
          item.id === active.id ? { ...item, column: overColumn } : item
        );
        onDataChange?.(newData);
      }

      onDragOver?.(event);
    },
    [data, columns, onDataChange, onDragOver]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCardId(null);
      onDragEnd?.(event);

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = data.findIndex((item) => item.id === active.id);
      const newIndex = data.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newData = arrayMove([...data], oldIndex, newIndex);
        onDataChange?.(newData);
      }
    },
    [data, onDataChange, onDragEnd]
  );

  const contextValue = useMemo(
    () => ({
      columns,
      data,
      activeCardId,
    }),
    [columns, data, activeCardId]
  );

  return (
    <KanbanContext.Provider value={contextValue}>
      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
      >
        <div className={cn("flex gap-4 overflow-x-auto p-4", className)}>
          {columns.map((column) => (
            <KanbanBoard id={column.id} key={column.id}>
              {children(column)}
            </KanbanBoard>
          ))}
        </div>
        <DragOverlay>
          {activeCardId && data.find((item) => item.id === activeCardId) && (
            <Card className="cursor-grabbing p-3 shadow-lg">
              {data.find((item) => item.id === activeCardId)?.name}
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </KanbanContext.Provider>
  );
}
