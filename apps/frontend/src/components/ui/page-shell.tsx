import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("flex h-full w-full min-w-0 flex-col bg-content-bg text-content-text", className)}>
      {children}
    </div>
  );
}
