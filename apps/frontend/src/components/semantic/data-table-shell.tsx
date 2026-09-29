import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DataTableShellProps {
  children: ReactNode;
  className?: string;
}

export function DataTableShell({ children, className }: DataTableShellProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-background", className)}>
      {children}
    </div>
  );
}
