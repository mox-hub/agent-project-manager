/**
 * ProjectRightSidebar - 项目详情右侧栏（基于共享右侧栏组件）
 * 布局与任务详情页一致：与主内容区完全左右并列，用 `hidden` 整体收起。
 * 内部卡片使用共享 SidebarPanel（圆角矩形 ↔ 圆角胶囊、图标/标题/收缩三角、同背景无分割线、流畅动画）。
 */

import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
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
import { RightSidebar } from '@/components/ui/right-sidebar';
import { SidebarPanel } from '@/components/ui/sidebar-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectDashboardSummary } from '../../hooks/use-project-dashboard-summary';
import type { ProjectStatus, ProjectPriority } from '../../api/project-api';
import { PROJECT_SIDEBAR_DEFAULT_WIDTH } from './project-sidebar-context';

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
      className="inline-flex items-center gap-1.5 max-w-40 h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap"
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

/** 右侧栏卡片区：Properties / Related / Activity */
export function ProjectRightSidebarContent({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [relatedCollapsed, setRelatedCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  const { data: summary, isLoading, error } = useProjectDashboardSummary(projectId);

  if (isLoading && !summary) {
    return (
      <SidebarPanel title="Loading" icon={<Activity className="size-3" />}>
        <p className="px-2 py-2 text-xs text-muted-foreground">加载中…</p>
      </SidebarPanel>
    );
  }

  const meta = summary?.projectMeta;
  const integrations = summary?.integrations;
  if (!meta || !integrations) {
    return (
      <SidebarPanel title="Properties" icon={<Tag className="size-3" />} iconClassName="text-muted-foreground">
        <p className="px-2 py-2 text-xs text-muted-foreground">
          {error ? '加载失败' : '暂无数据'}
        </p>
      </SidebarPanel>
    );
  }

  const activities = summary.activityFeed ?? [];
  const repositories = integrations.repositories;
  const memberCount = meta.members?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Properties — 项目元数据 */}
      <SidebarPanel
        title="Properties"
        icon={<Tag className="size-3" />}
        iconClassName="text-muted-foreground"
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
            <span className="inline-flex items-center gap-1.5 max-w-40 h-6 px-1 rounded-full text-xs text-muted-foreground whitespace-nowrap">
              <Avatar className="h-4 w-4">
                {meta.owner.avatarUrl ? <AvatarImage src={meta.owner.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-9">
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
          <span className="text-11 text-muted-foreground whitespace-nowrap">
            {meta.startDate ? new Date(meta.startDate).toLocaleDateString() : '—'}
            {' → '}
            {meta.targetDate ? new Date(meta.targetDate).toLocaleDateString() : '—'}
          </span>
        </PropertyRow>
      </SidebarPanel>

      {/* 2. Related — 项目关联数据 */}
      <SidebarPanel
        title="Related"
        icon={<Link2 className="size-3" />}
        iconClassName="text-muted-foreground"
        collapsed={relatedCollapsed}
        onToggle={() => setRelatedCollapsed((v) => !v)}
      >
        <PropertyRow icon={<GitBranch className="size-3.5" />} label="Repositories">
          <button
            type="button"
            onClick={() => navigate('/app/repositories')}
            className="inline-flex items-center gap-1 max-w-40 h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="truncate">{repositories.length} 仓库</span>
          </button>
        </PropertyRow>
        <PropertyRow icon={<FileText className="size-3.5" />} label="Documents">
          <button
            type="button"
            onClick={() => navigate('/app/documents')}
            className="inline-flex items-center gap-1 max-w-40 h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="truncate">{integrations.docLinksCount} 关联文档</span>
          </button>
        </PropertyRow>
        <PropertyRow icon={<BookOpen className="size-3.5" />} label="API Docs">
          <button
            type="button"
            onClick={() => navigate('/app/documents?type=api')}
            className="inline-flex items-center gap-1 max-w-40 h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="truncate">{integrations.apiDocLinksCount} API 文档</span>
          </button>
        </PropertyRow>
        <PropertyRow icon={<Link2 className="size-3.5" />} label="Links">
          <span className="inline-flex items-center gap-1 max-w-40 h-6 px-2 rounded-full border border-border text-xs text-muted-foreground">
            <span className="truncate">{integrations.externalLinksCount} 外部链接</span>
          </span>
        </PropertyRow>
        <PropertyRow icon={<Users className="size-3.5" />} label="Team">
          <button
            type="button"
            onClick={() => navigate(`/app/projects/${projectId}/team`)}
            className="inline-flex items-center gap-1 max-w-40 h-6 px-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="truncate">{memberCount} 成员</span>
          </button>
        </PropertyRow>
      </SidebarPanel>

      {/* 3. Activity — 项目版本动态 */}
      <SidebarPanel
        title="Activity"
        icon={<Sparkles className="size-3" />}
        iconClassName="text-accent-purple"
        collapsed={activityCollapsed}
        onToggle={() => setActivityCollapsed((v) => !v)}
      >
        {activities.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">暂无动态</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {activities.slice(0, 8).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <AlertCircle className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground truncate">{activity.summary}</p>
                  <p className="text-10 text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString()} · {activity.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SidebarPanel>
    </div>
  );
}

interface ProjectRightSidebarProps {
  projectId: string;
  /** 是否隐藏（收起）侧边栏 */
  hidden?: boolean;
  /** 宽度，默认与任务详情页一致 */
  width?: number;
}

export function ProjectRightSidebar({ projectId, hidden, width }: ProjectRightSidebarProps) {
  return (
    <RightSidebar hidden={hidden} width={width ?? PROJECT_SIDEBAR_DEFAULT_WIDTH}>
      <ProjectRightSidebarContent projectId={projectId} />
    </RightSidebar>
  );
}

export { PROJECT_SIDEBAR_DEFAULT_WIDTH };
