import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface ToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function Toolbar({ left, right, className }: ToolbarProps) {
  return (
    <section
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-content-border px-2 py-2",
        className
      )}
    >
      <div>{left}</div>
      <div className="flex flex-1 justify-end min-w-[260px]">
        {right}
      </div>
    </section>
  );
}

export interface FilterToolbarProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function FilterToolbar({ label = "Filter", children, className }: FilterToolbarProps) {
  return (
    <Toolbar
      left={
        <div className="text-xs text-content-text-muted">
          {label}
        </div>
      }
      right={children}
      className={className}
    />
  );
}
