import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-content-border p-6 text-center", className)}>
      <h3 className="text-base font-semibold text-content-text">{title}</h3>
      {description ? <p className="mt-1 text-sm text-content-text-secondary">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
