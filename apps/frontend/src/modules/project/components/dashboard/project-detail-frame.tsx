import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/ui/page-shell';
import { SidebarToggle } from '@/components/ui/right-sidebar';
import { cn } from '@/lib/utils';
import { ProjectDetailNav } from './project-detail-nav';
import {
  useProjectSidebar,
  PROJECT_SIDEBAR_DEFAULT_WIDTH,
} from './project-sidebar-context';
import { ProjectRightSidebar } from './project-right-sidebar';

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
  /** 是否启用共享右侧栏 */
  enableSharedSidebar?: boolean;
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
  enableSharedSidebar = true,
}: ProjectDetailFrameProps) {
  const safeProjectName = projectName?.trim() || 'Project';
  const sidebarCtx = useProjectSidebar();
  const [localHidden, setLocalHidden] = useState(false);
  const [localWidth] = useState(PROJECT_SIDEBAR_DEFAULT_WIDTH);

  const sidebarHidden = sidebarCtx?.hidden ?? localHidden;
  const sidebarWidth = sidebarCtx?.width ?? localWidth;

  const showSidebar = enableSharedSidebar;
  const toggleSidebar = () => {
    if (sidebarCtx) sidebarCtx.toggle();
    else setLocalHidden((v) => !v);
  };

  return (
    <PageShell className={cn('overflow-hidden bg-content-bg', className)} aiPage={aiPage}>
      {!hideBreadcrumb && (
        <div className="shrink-0 border-b border-border bg-background">
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
              {topActions}
              {showSidebar ? <SidebarToggle open={!sidebarHidden} onToggle={toggleSidebar} /> : null}
              <Badge className="h-6 rounded-full border border-accent-green/30 bg-accent-green-light px-2.5 text-sm font-semibold text-accent-green">
                {trackingScore !== undefined ? `${trackingScore} · ` : ''}
                {trackingLabel}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Main（可独立滚动） ── */}
        <div className="flex-1 min-w-0 overflow-y-auto">
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
        </div>

        {/* ── Right sidebar：与主区域完全左右并列 ── */}
        {showSidebar ? (
          <ProjectRightSidebar projectId={projectId} hidden={sidebarHidden} width={sidebarWidth} />
        ) : null}
      </div>
    </PageShell>
  );
}