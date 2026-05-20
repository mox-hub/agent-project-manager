import * as React from "react";
import { List, LayoutGrid, Kanban, Calendar, Map } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type ViewMode = "list" | "grid" | "board" | "gantt" | "roadmap";

export interface ViewSwitcherProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  className?: string;
  modes?: ViewMode[];
}

const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "list", label: "List", icon: <List size={16} /> },
  { id: "grid", label: "Grid", icon: <LayoutGrid size={16} /> },
  { id: "board", label: "Board", icon: <Kanban size={16} /> },
  { id: "gantt", label: "Timeline", icon: <Calendar size={16} /> },
  { id: "roadmap", label: "Roadmap", icon: <Map size={16} /> },
];

export function ViewSwitcher({ value, onValueChange, className, modes }: ViewSwitcherProps) {
  const visibleModes = React.useMemo(() => {
    if (!modes || modes.length === 0) return viewModes;
    const modeSet = new Set(modes);
    return viewModes.filter((mode) => modeSet.has(mode.id));
  }, [modes]);

  return (
    <SegmentedControl
      value={value}
      onChange={onValueChange}
      className={className}
      options={visibleModes.map((mode) => ({
        value: mode.id,
        icon: mode.icon,
        label: mode.label,
      }))}
    />
  );
}
