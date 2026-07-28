import type { KanbanColumn, KanbanItem } from "./kanban-board";

export function reorderColumns(columns: KanbanColumn[], activeId: string, overId: string): KanbanColumn[] {
  const oldIndex = columns.findIndex((column) => column.id === activeId);
  const newIndex = columns.findIndex((column) => column.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return columns;
  }
  const next = [...columns];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}

export function reorderItemsWithinColumn(
  items: KanbanItem[],
  columnId: string,
  activeItemId: string,
  overItemId: string,
): KanbanItem[] {
  const sameColumn = items.filter((item) => item.columnId === columnId);
  const oldIndex = sameColumn.findIndex((item) => item.id === activeItemId);
  const newIndex = sameColumn.findIndex((item) => item.id === overItemId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return items;
  }
  const reordered = [...sameColumn];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);
  const others = items.filter((item) => item.columnId !== columnId);
  return [...others, ...reordered];
}

export function moveItemBetweenColumns(
  items: KanbanItem[],
  itemId: string,
  targetColumnId: string,
): KanbanItem[] {
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  if (sourceIndex === -1) {
    return items;
  }
  if (items[sourceIndex].columnId === targetColumnId) {
    return items;
  }
  const next = [...items];
  next[sourceIndex] = { ...next[sourceIndex], columnId: targetColumnId };
  return next;
}
