import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  aiPage?: string;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function PageShell({ children, className, aiPage, title, description, icon, actions }: PageShellProps) {
  const hasHeader = title || description || icon || actions;
  return (
    <div
      className={cn("flex flex-1 min-h-0 flex-col bg-content-bg text-content-text", className)}
      data-ai-page={aiPage}
      data-ai-component={aiPage ? `${aiPage}.shell` : "ui.page-shell"}
      data-ai-role="page"
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-content-border px-6 py-4">
          <div className="flex items-start gap-3 min-w-0">
            {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
            <div className="min-w-0">
              {title && <h1 className="text-lg font-semibold leading-tight">{title}</h1>}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
