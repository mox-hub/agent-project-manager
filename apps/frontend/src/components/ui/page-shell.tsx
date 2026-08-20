import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, type PageHeaderMetric } from "./page-header";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  aiPage?: string;
  title?: ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: ReactNode;
  metrics?: PageHeaderMetric[];
  favoriteId?: string;
}

export function PageShell({
  children,
  className,
  aiPage,
  title,
  icon,
  iconColor,
  actions,
  metrics,
  favoriteId,
}: PageShellProps) {
  const hasHeader = Boolean(title || icon || actions || metrics);
  return (
    <div
      className={cn("flex flex-1 min-h-0 flex-col bg-content-bg text-content-text", className)}
      data-ai-page={aiPage}
      data-ai-component={aiPage ? `${aiPage}.shell` : "ui.page-shell"}
      data-ai-role="page"
    >
      {hasHeader && (
        <PageHeader
          title={title ?? ""}
          icon={icon}
          iconColor={iconColor}
          actions={actions}
          metrics={metrics}
          favoriteId={favoriteId}
          aiId={aiPage}
          className="border-content-border bg-transparent"
        />
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
