/**
 * ProjectRightSidebar - 项目详情右侧栏（基于共享右侧栏组件）
 * 布局与任务详情页一致：与主内容区完全左右并列，用 `hidden` 整体收起。
 * 头部按钮操作区（SidebarButtonGroup）承载 Linear 来源/同步状态徽章；
 * 属性面板复用 ProjectPropertyPanel（支持下拉选择），Related/Activity 用共享 SidebarPanel。
 */

import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  FileText,
  GitBranch,
  Link2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RightSidebar, SidebarButtonGroup } from '@/components/ui/right-sidebar';
import { SidebarPanel } from '@/components/ui/sidebar-panel';
import {
  LinearSourceBadge,
  LinearSyncStatusBadge,
} from '@/modules/linear/components/linear-status-badge';
import { ProjectPropertyPanel } from '../project-property-panel';
import { useProjectDashboardSummary } from '../../hooks/use-project-dashboard-summary';
import { useProjectDetail } from '../../hooks/use-project-detail';
import { PROJECT_SIDEBAR_DEFAULT_WIDTH } from './project-sidebar-context';

/** 右侧栏卡片区：Properties（可编辑）/ Related / Activity */
export function ProjectRightSidebarContent({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [relatedCollapsed, setRelatedCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  const { data: summary, isLoading, error } = useProjectDashboardSummary(projectId);
  const { data: project } = useProjectDetail(projectId);

  const meta = summary?.projectMeta;
  const integrations = summary?.integrations;
  const activities = summary?.activityFeed ?? [];
  const repositories = integrations?.repositories ?? [];
  const memberCount = meta?.members?.length ?? 0;
  const boundTeams = project?.teams ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Properties — 项目元数据（可编辑属性面板组件） */}
      <ProjectPropertyPanel projectId={projectId} />

      {/* 2. Related — 项目关联数据 */}
      {!meta || !integrations ? (
        <SidebarPanel
          title={t('project.sidebar.related')}
          icon={<Link2 className="size-3" />}
          iconClassName="text-muted-foreground"
        >
          <p className="px-2 py-2 text-xs text-muted-foreground">
            {isLoading ? t('project.sidebar.loading') : error ? t('project.sidebar.loadFailed') : t('project.sidebar.noData')}
          </p>
        </SidebarPanel>
      ) : (
        <SidebarPanel
          title={t('project.sidebar.related')}
          icon={<Link2 className="size-3" />}
          iconClassName="text-muted-foreground"
          collapsed={relatedCollapsed}
          onToggle={() => setRelatedCollapsed((v) => !v)}
        >
          <SidebarLinkRow
            icon={<GitBranch className="size-3.5" />}
            label={t('project.sidebar.repositories')}
            text={t('project.sidebar.repoCount', { count: repositories.length })}
            onClick={() => navigate('/app/repositories')}
          />
          <SidebarLinkRow
            icon={<FileText className="size-3.5" />}
            label={t('project.sidebar.documents')}
            text={t('project.sidebar.docCount', { count: integrations.docLinksCount })}
            onClick={() => navigate('/app/documents')}
          />
          <SidebarLinkRow
            icon={<BookOpen className="size-3.5" />}
            label={t('project.sidebar.apiDocs')}
            text={t('project.sidebar.apiDocCount', { count: integrations.apiDocLinksCount })}
            onClick={() => navigate('/app/documents?type=api')}
          />
          <SidebarLinkRow
            icon={<Link2 className="size-3.5" />}
            label={t('project.sidebar.links')}
            text={t('project.sidebar.linkCount', { count: integrations.externalLinksCount })}
          />
          <SidebarLinkRow
            icon={<Users className="size-3.5" />}
            label={t('project.sidebar.team')}
            text={
              boundTeams.length > 0
                ? t('project.sidebar.teamCount', { count: boundTeams.length })
                : t('project.sidebar.memberCount', { count: memberCount })
            }
            onClick={
              boundTeams.length > 0
                ? () => navigate('/app/teams')
                : () => navigate(`/app/projects/${projectId}/team`)
            }
          />
          {boundTeams.length > 0 ? (
            <div className="flex flex-wrap gap-1 px-2 pb-1.5 pl-8">
              {boundTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  title={team.name}
                  onClick={() => navigate(`/app/teams/${team.id}`)}
                  className="inline-flex h-5 max-w-full items-center gap-1 rounded-full border border-border px-1.5 text-10 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color || '#5E6AD2' }}
                  />
                  <span className="max-w-32 truncate">{team.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </SidebarPanel>
      )}

      {/* 3. Activity — 项目版本动态 */}
      <SidebarPanel
        title={t('project.sidebar.activity')}
        icon={<Sparkles className="size-3" />}
        iconClassName="text-accent-purple"
        collapsed={activityCollapsed}
        onToggle={() => setActivityCollapsed((v) => !v)}
      >
        {activities.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">{t('project.sidebar.noActivity')}</p>
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

/** Related 面板行：标签 + 可点计数胶囊 */
function SidebarLinkRow({
  icon,
  label,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  text: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <span className="inline-flex items-center gap-1 max-w-40 h-6 px-2 rounded-full border border-border text-xs text-muted-foreground transition-colors">
      <span className="truncate">{text}</span>
    </span>
  );
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg min-h-8 hover:bg-muted/40 transition-colors">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{label}</span>
      <div className="shrink-0">
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
          >
            {content}
          </button>
        ) : (
          content
        )}
      </div>
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
  const { data: project } = useProjectDetail(projectId);
  const isLinearLinked = project?.externalProvider === 'linear';

  return (
    <RightSidebar hidden={hidden} width={width ?? PROJECT_SIDEBAR_DEFAULT_WIDTH}>
      {/* 头部按钮操作区：Linear 来源/同步状态徽章（仅 Linear 同步项目） */}
      {isLinearLinked ? (
        <SidebarButtonGroup className="px-1" data-ai-component="project.right-sidebar.linear-status" data-ai-role="status">
          <LinearSourceBadge source="linear" className="h-6 shrink-0 rounded-full px-2.5 text-10" />
          <LinearSyncStatusBadge status={project?.syncStatus} pill />
        </SidebarButtonGroup>
      ) : null}
      <ProjectRightSidebarContent projectId={projectId} />
    </RightSidebar>
  );
}

export { PROJECT_SIDEBAR_DEFAULT_WIDTH };
