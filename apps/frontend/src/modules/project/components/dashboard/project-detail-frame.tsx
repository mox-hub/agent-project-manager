import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/ui/page-shell';
import { cn } from '@/lib/utils';
import { ProjectDetailNav } from './project-detail-nav';

interface ProjectDetailFrameProps {
  aiPage: string;
  projectId: string;
  projectName?: string | null;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  topActions?: ReactNode;
  trackingLabel?: string;
  trackingScore?: number;
  contextBar?: ReactNode;
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
  hideBreadcrumb?: boolean;
}

export function ProjectDetailFrame({
  aiPage,
  projectId,
  projectName,
  title,
  description,
  actions,
  topActions,
  trackingLabel = 'On Track',
  trackingScore,
  contextBar,
  children,
  className,
  hideHeader = false,
  hideBreadcrumb = false,
}: ProjectDetailFrameProps) {
  const safeProjectName = projectName?.trim() || 'Project';

  return (
    <PageShell className={cn('bg-content-bg', className)} aiPage={aiPage}>
      {!hideBreadcrumb && (
        <div className="border-b border-border bg-background">
          <div className="mx-auto flex h-12 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                <Link to="/app/projects" className="no-underline transition-colors hover:text-foreground/90">
                  Projects
                </Link>
                <ChevronRight size={12} />
                <span className="truncate font-semibold text-foreground">{safeProjectName}</span>
              </div>
              <span className="mx-1 h-3.5 w-px bg-border" />
              <ProjectDetailNav projectId={projectId} />
            </div>
            <div className="flex items-center gap-2">
              {topActions ?? (
                <Link
                  to="/app/ai"
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground no-underline hover:bg-muted/60 hover:text-foreground"
                >
                  <Sparkles size={12} />
                  Ask AI
                </Link>
              )}
              <Badge className="h-6 rounded-full border border-accent-green/30 bg-accent-green-light px-2.5 text-sm font-semibold text-accent-green">
                {trackingScore !== undefined ? `${trackingScore} · ` : ''}
                {trackingLabel}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-6 pt-4 sm:px-6">
        {!hideHeader ? (
          <section className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold leading-none tracking-[-0.01em] text-foreground">{title}</h1>
              {description ? (
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </section>
        ) : null}

        {contextBar ? <section className="mb-4">{contextBar}</section> : null}

        {children}
      </div>
    </PageShell>
  );
}
