import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/ui/page-shell';
import { SidebarToggle } from '@/components/ui/right-sidebar';
import { cn } from '@/lib/utils';
import { ProjectDetailNav } from './project-detail-nav';
import { ProjectDetailHeaderCard } from './project-detail-header-card';
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
          <div className="mx-auto flex h-12 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
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
          <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-4 sm:px-6">
            {!hideHeader ? (
              /* sticky 头部卡片：负 margin 抵消容器左右 padding，背景铺满横向防止内容穿缝 */
              <div className="sticky top-0 z-20 -mx-4 bg-content-bg px-4 pb-3 sm:-mx-6 sm:px-6">
                <ProjectDetailHeaderCard title={title} description={description} actions={actions} className="mb-0" />
              </div>
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