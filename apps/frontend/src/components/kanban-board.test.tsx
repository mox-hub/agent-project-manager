import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard, type KanbanColumn, type KanbanItem } from "@/components/kanban-board";

const columns: KanbanColumn[] = [
  { id: "todo", title: "Todo" },
  { id: "done", title: "Done" },
];

const items: KanbanItem[] = [{ id: "1", columnId: "todo", title: "Task 1" }];

describe("KanbanBoard", () => {
  it("renders columns and items", () => {
    render(<KanbanBoard columns={columns} items={items} />);
    expect(screen.getByText("Todo")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.getByText("Task 1")).toBeTruthy();
  });

  it("supports custom column header renderer", () => {
    const renderer = vi.fn((_column: KanbanColumn, count: number) => <div>{count} items</div>);
    render(<KanbanBoard columns={columns} items={items} renderColumnHeader={renderer} />);
    expect(renderer).toHaveBeenCalled();
    expect(screen.getByText("1 items")).toBeTruthy();
  });
});
