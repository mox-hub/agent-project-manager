import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  aiId?: string;
}

export function PageHeader({ title, description, actions, className, aiId }: PageHeaderProps) {
  return (
    <header
      className={cn("flex w-full shrink-0 flex-col gap-4 border-b border-border bg-background px-6 py-5 md:px-7", className)}
      data-ai-component={aiId ? `${aiId}.header` : "ui.page-header"}
      data-ai-role="content"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-foreground">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
