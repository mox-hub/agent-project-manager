import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  aiPage?: string;
}

export function PageShell({ children, className, aiPage }: PageShellProps) {
  return (
    <div
      className={cn("flex h-full w-full min-w-0 flex-col bg-content-bg text-content-text", className)}
      data-ai-page={aiPage}
      data-ai-component={aiPage ? `${aiPage}.shell` : "ui.page-shell"}
      data-ai-role="page"
    >
      {children}
    </div>
  );
}
