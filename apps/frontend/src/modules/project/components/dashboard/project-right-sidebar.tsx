/**
 * ProjectRightSidebar - 项目共享右侧可折叠胶囊侧边栏
 * 自适应从 context 读取 hidden / width 状态，自行拉取 dashboard summary 数据
 * 内部包含拖拽调整宽度句柄
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Folder,
  GitBranch,
  FileText,
  Link2,
  BookOpen,
  Users,
  Tag,
  Flag,
  Calendar,
  User as UserIcon,
  Activity,
  Sparkles,
  CircleDot,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectDashboardSummary } from '../../hooks/use-project-dashboard-summary';
import type { ProjectStatus, ProjectPriority } from '../../api/project-api';
import {
  useProjectSidebar,
  PROJECT_SIDEBAR_DEFAULT_WIDTH,
  PROJECT_SIDEBAR_MIN_WIDTH,
  PROJECT_SIDEBAR_MAX_WIDTH,
} from './project-sidebar-context';

const STATUS_COLOR: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#10b981' },
  paused: { label: 'Paused', color: '#f59e0b' },
  archived: { label: 'Archived', color: '#6b7280' },
  completed: { label: 'Completed', color: '#3b82f6' },
};

const PRIORITY_COLOR: Record<ProjectPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#22c55e' },
  medium: { label: 'Medium', color: '#eab308' },
  high: { label: 'High', color: '#f97316' },
  urgent: { label: 'Urgent', color: '#ef4444' },
};

const HEALTH_COLOR: Record<string, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: '#10b981' },
  at_risk: { label: 'At Risk', color: '#f59e0b' },
  off_track: { label: 'Off Track', color: '#ef4444' },
};

function CollapsibleCard({
  title,
  icon,
  collapsed,
  onToggle,
  children,
  action,
}: {
  title: string;
  icon?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden transition-all',
        collapsed && 'rounded-full',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 bg-muted/30',
          collapsed && 'border-b-0',
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {action}
          <button
            type="button"
            onClick={onToggle}
            className="size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={collapsed ? '展开' : '收起'}
          >
            {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-2 flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg min-h-8 hover:bg-muted/40 transition-colors">
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Capsule({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 max-w-[160px] h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap"
      style={color ? { color } : undefined}
    >
      {children}
    </span>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
  );
}

interface ProjectRightSidebarProps {
  projectId: string;
}

export function ProjectRightSidebar({ projectId }: ProjectRightSidebarProps) {
  const ctx = useProjectSidebar();
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [relatedCollapsed, setRelatedCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!ctx) return;
      event.preventDefault();
      isDraggingRef.current = true;
      startXRef.current = event.clientX;
      startWidthRef.current = ctx.width;
      const handleMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = startXRef.current - ev.clientX;
        const next = Math.min(
          ctx.maxWidth,
          Math.max(ctx.minWidth, startWidthRef.current + delta),
        );
        ctx.setWidth(next);
      };
      const handleUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [ctx],
  );

  useEffect(() => () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  if (!ctx) return null;
  if (ctx.hidden) return null;

  const meta = summary?.projectMeta;
  const integrations = summary?.integrations;
  const activities = summary?.activityFeed ?? [];

  return (
    <aside
      className="relative shrink-0 pl-4 pr-1 py-1 space-y-3 overflow-y-auto bg-transparent border-l border-border/40"
      style={{ width: `${ctx.width}px` }}
      data-ai-component="project.project-dashboard.right-sidebar"
    >
      {/* Drag handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent-blue/30 active:bg-accent-blue/50 transition-colors"
        title="拖动调整宽度"
        data-ai-component="project.project-dashboard.right-sidebar.resize-handle"
      />

      {isLoading || !meta || !integrations ? (
        <CollapsibleCard title="Loading" icon={<Activity className="size-3 text-muted-foreground" />} collapsed={false} onToggle={() => undefined}>
          <p className="px-2 py-2 text-xs text-muted-foreground">加载中…</p>
        </CollapsibleCard>
      ) : (
        <>
          {/* 1. Properties — 项目元数据 */}
          <CollapsibleCard
            title="Properties"
            icon={<Tag className="size-3 text-muted-foreground" />}
            collapsed={propsCollapsed}
            onToggle={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow icon={<Folder className="size-3.5" />} label="Type">
              <Capsule>
                <span className="truncate">{meta.type}</span>
              </Capsule>
            </PropertyRow>
            <PropertyRow icon={<Activity className="size-3.5" />} label="Status">
              {(() => {
                const status = STATUS_COLOR[meta.status as ProjectStatus] ?? STATUS_COLOR.active;
                return (
                  <Capsule color={status.color}>
                    <StatusDot color={status.color} />
                    <span className="truncate">{status.label}</span>
                  </Capsule>
                );
              })()}
            </PropertyRow>
            {meta.priority ? (
              <PropertyRow icon={<Flag className="size-3.5" />} label="Priority">
                <Capsule color={PRIORITY_COLOR[meta.priority].color}>
                  <StatusDot color={PRIORITY_COLOR[meta.priority].color} />
                  <span className="truncate">{PRIORITY_COLOR[meta.priority].label}</span>
                </Capsule>
              </PropertyRow>
            ) : null}
            {meta.healthStatus ? (
              <PropertyRow icon={<CircleDot className="size-3.5" />} label="Health">
                {(() => {
                  const health = HEALTH_COLOR[meta.healthStatus as string] ?? HEALTH_COLOR.on_track;
                  return (
                    <Capsule color={health.color}>
                      <StatusDot color={health.color} />
                      <span className="truncate">{health.label}</span>
                    </Capsule>
                  );
                })()}
              </PropertyRow>
            ) : null}
            <PropertyRow icon={<UserIcon className="size-3.5" />} label="Owner">
              {meta.owner ? (
                <span className="inline-flex items-center gap-1.5 max-w-[160px] h-6 px-1 rounded-full text-xs text-muted-foreground whitespace-nowrap">
                  <Avatar className="h-4 w-4">
                    {meta.owner.avatarUrl ? (
                      <AvatarImage src={meta.owner.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[9px]">
                      {(meta.owner.displayName || '?').slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{meta.owner.displayName}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/60">未指定</span>
              )}
            </PropertyRow>
            <PropertyRow icon={<Calendar className="size-3.5" />} label="Schedule">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {meta.startDate ? new Date(meta.startDate).toLocaleDateString() : '—'}
                {' → '}
                {meta.targetDate ? new Date(meta.targetDate).toLocaleDateString() : '—'}
              </span>
            </PropertyRow>
          </CollapsibleCard>

          {/* 2. Related — 项目关联数据 */}
          <RelatedCard
            collapsed={relatedCollapsed}
            onToggle={() => setRelatedCollapsed((v) => !v)}
            meta={meta}
            projectId={projectId}
            repositories={integrations.repositories}
            externalLinksCount={integrations.externalLinksCount}
            docLinksCount={integrations.docLinksCount}
            apiDocLinksCount={integrations.apiDocLinksCount}
          />

          {/* 3. Activity — 项目版本动态 */}
          <ActivityCard
            collapsed={activityCollapsed}
            onToggle={() => setActivityCollapsed((v) => !v)}
            activities={activities}
          />
        </>
      )}
    </aside>
  );
}

function RelatedCard({
  collapsed,
  onToggle,
  meta,
  projectId,
  repositories,
  externalLinksCount,
  docLinksCount,
  apiDocLinksCount,
}: {
  collapsed: boolean;
  onToggle: () => void;
  meta: NonNullable<ReturnType<typeof useProjectDashboardSummary>['data']>['projectMeta'];
  projectId: string;
  repositories: NonNullable<ReturnType<typeof useProjectDashboardSummary>['data']>['integrations']['repositories'];
  externalLinksCount: number;
  docLinksCount: number;
  apiDocLinksCount: number;
}) {
  const navigate = useNavigate();
  const memberCount = meta.members?.length ?? 0;

  return (
    <CollapsibleCard
      title="Related"
      icon={<Link2 className="size-3 text-muted-foreground" />}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <PropertyRow icon={<GitBranch className="size-3.5" />} label="Repositories">
        <button
          type="button"
          onClick={() => navigate('/app/repositories')}
          className="inline-flex items-center gap-1 max-w-[160px] h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="truncate">{repositories.length} 仓库</span>
        </button>
      </PropertyRow>
      <PropertyRow icon={<FileText className="size-3.5" />} label="Documents">
        <button
          type="button"
          onClick={() => navigate('/app/documents')}
          className="inline-flex items-center gap-1 max-w-[160px] h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="truncate">{docLinksCount} 关联文档</span>
        </button>
      </PropertyRow>
      <PropertyRow icon={<BookOpen className="size-3.5" />} label="API Docs">
        <button
          type="button"
          onClick={() => navigate('/app/documents?type=api')}
          className="inline-flex items-center gap-1 max-w-[160px] h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="truncate">{apiDocLinksCount} API 文档</span>
        </button>
      </PropertyRow>
      <PropertyRow icon={<Link2 className="size-3.5" />} label="Links">
        <span className="inline-flex items-center gap-1 max-w-[160px] h-6 px-2 rounded-full border border-border text-xs text-muted-foreground">
          <span className="truncate">{externalLinksCount} 外部链接</span>
        </span>
      </PropertyRow>
      <PropertyRow icon={<Users className="size-3.5" />} label="Team">
        <button
          type="button"
          onClick={() => navigate(`/app/projects/${projectId}/team`)}
          className="inline-flex items-center gap-1 max-w-[160px] h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="truncate">{memberCount} 成员</span>
        </button>
      </PropertyRow>
    </CollapsibleCard>
  );
}

function ActivityCard({
  collapsed,
  onToggle,
  activities,
}: {
  collapsed: boolean;
  onToggle: () => void;
  activities: NonNullable<ReturnType<typeof useProjectDashboardSummary>['data']>['activityFeed'];
}) {
  return (
    <CollapsibleCard
      title="Activity"
      icon={<Sparkles className="size-3 text-accent-purple" />}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {activities.length === 0 ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">暂无动态</p>
      ) : (
        activities.slice(0, 8).map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <AlertCircle className="size-3 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-foreground truncate">{activity.summary}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(activity.timestamp).toLocaleDateString()} · {activity.source}
              </p>
            </div>
          </div>
        ))
      )}
    </CollapsibleCard>
  );
}

export { PROJECT_SIDEBAR_DEFAULT_WIDTH };