import * as React from "react";
import { cn } from "@/lib/utils";
import { List, LayoutGrid, Kanban } from "lucide-react";

export type ViewMode = "list" | "grid" | "board";

export interface ViewSwitcherProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  className?: string;
}

const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "list", label: "List", icon: <List size={16} /> },
  { id: "grid", label: "Grid", icon: <LayoutGrid size={16} /> },
  { id: "board", label: "Board", icon: <Kanban size={16} /> },
];

export function ViewSwitcher({ value, onValueChange, className }: ViewSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-md border border-content-border bg-content-bg",
        className
      )}
    >
      {viewModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onValueChange(mode.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
            "border-l border-content-border first:border-l-0",
            value === mode.id
              ? "bg-accent-blue text-white"
              : "text-content-text-muted hover:bg-content-bg-secondary hover:text-content-text"
          )}
          aria-pressed={value === mode.id}
        >
          {mode.icon}
          {mode.label}
        </button>
      ))}
    </div>
  );
}
