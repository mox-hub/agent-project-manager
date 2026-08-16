import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  aiId?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  aiId,
  icon: Icon,
  iconColor = "text-primary",
}: PageHeaderProps) {
  return (
    <header
      className={cn("flex w-full shrink-0 flex-col gap-4 border-b border-border bg-background px-6 py-4 md:px-7", className)}
      data-ai-component={aiId ? `${aiId}.header` : "ui.page-header"}
      data-ai-role="content"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="mb-1 flex items-center gap-1">
                {breadcrumbs.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <h1 className="m-0 truncate text-lg font-semibold leading-tight text-foreground">{title}</h1>
            {description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
