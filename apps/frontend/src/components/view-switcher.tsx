import * as React from "react";
import { cn } from "@/lib/utils";
import { List, LayoutGrid, Kanban, Calendar } from "lucide-react";
import { Tabs, TabsTrigger } from "@/components/ui/tabs";

export type ViewMode = "list" | "grid" | "board" | "gantt";

export interface ViewSwitcherProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  className?: string;
}

const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "list", label: "List", icon: <List size={16} /> },
  { id: "grid", label: "Grid", icon: <LayoutGrid size={16} /> },
  { id: "board", label: "Board", icon: <Kanban size={16} /> },
  { id: "gantt", label: "Timeline", icon: <Calendar size={16} /> },
];

export function ViewSwitcher({ value, onValueChange, className }: ViewSwitcherProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange as (value: string) => void}>
      <div
        className={cn(
          "inline-flex overflow-hidden rounded-md border border-content-border bg-content-bg",
          className
        )}
      >
        {viewModes.map((mode) => (
          <TabsTrigger
            key={mode.id}
            value={mode.id}
            className="border-l border-content-border first:border-l-0"
          >
            <div className="flex items-center gap-1.5">
              {mode.icon}
              {mode.label}
            </div>
          </TabsTrigger>
        ))}
      </div>
    </Tabs>
  );
}
