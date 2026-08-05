import { describe, expect, it } from "vitest";
import { moveItemBetweenColumns, reorderColumns, reorderItemsWithinColumn } from "@/shared/components/kanban-board.utils";
import type { KanbanColumn, KanbanItem } from "@/shared/components/kanban-board";

const columns: KanbanColumn[] = [
  { id: "todo", title: "Todo" },
  { id: "doing", title: "Doing" },
  { id: "done", title: "Done" },
];

const items: KanbanItem[] = [
  { id: "a", columnId: "todo", title: "A" },
  { id: "b", columnId: "todo", title: "B" },
  { id: "c", columnId: "doing", title: "C" },
];

describe("kanban-board utils", () => {
  it("reorders columns", () => {
    const reordered = reorderColumns(columns, "todo", "done");
    expect(reordered.map((column) => column.id)).toEqual(["doing", "done", "todo"]);
  });

  it("reorders items in same column", () => {
    const reordered = reorderItemsWithinColumn(items, "todo", "a", "b");
    const todoItems = reordered.filter((item) => item.columnId === "todo");
    expect(todoItems.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("moves item between columns", () => {
    const moved = moveItemBetweenColumns(items, "a", "done");
    expect(moved.find((item) => item.id === "a")?.columnId).toBe("done");
  });
});
