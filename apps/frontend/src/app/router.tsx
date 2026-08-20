import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router-dom';
import { LoginPage } from '@/modules/auth/pages/login-page';
import { AuthGuard } from '@/modules/auth/components/auth-guard';
import { ShellLayout } from '@/shared/layout/shell-layout';
import { ProjectListPage } from '@/modules/project/pages/project-list-page';
import { ProjectDashboardPage } from '@/modules/project/pages/project-dashboard-page';
import { ProjectBoardPage } from '@/modules/project/pages/project-board-page';
import { ProjectMilestonesPage } from '@/modules/project/pages/project-milestones-page';
import { ProjectTeamPage } from '@/modules/project/pages/project-team-page';
import { DashboardPage } from '@/modules/project/pages/dashboard-page';
import { ErrorPage } from '@/shared/pages/error-page';
// TerminalPage 已废弃 - Terminal模块已并入Runtime模块的terminal capability
import { SettingsPage } from '@/modules/settings/pages/settings-page';
import { AppearanceSettingsSection } from '@/modules/settings/pages/sections/appearance-section';
import { GitSettingsSection } from '@/modules/settings/pages/sections/git-section';
import { TerminalSettingsSection } from '@/modules/settings/pages/sections/terminal-section';
import {
  LabelsSettingsSection,
  StatusesSettingsSection,
  RolesSettingsSection,
  TemplatesSettingsSection,
  StorageSettingsSection,
} from '@/modules/settings/pages/sections/manager-sections';
import { ShortIdSettingsSection } from '@/modules/settings/pages/sections/short-id-section';
import { AiManagementSection } from '@/modules/settings/pages/sections/ai-management-section';
import { AiAgentsSection } from '@/modules/settings/pages/sections/ai-agents-section';
import { AiExecutionCenterSection } from '@/modules/settings/pages/sections/ai-execution-center-section';
import { IntegrationsSettingsSection } from '@/modules/settings/pages/sections/integrations-section';
import { GithubIntegrationSection } from '@/modules/settings/pages/sections/github-integration-section';
import { LinearIntegrationSection } from '@/modules/settings/pages/sections/linear-integration-section';
import { ProjectSettingsPage } from '@/modules/project/pages/project-settings-page';
import { NotificationCenterPage } from '@/modules/notification/pages/notification-center-page';
import { RepositoryListPage } from '@/modules/git/pages/repository-list-page';
import { RepositoryDetailPage } from '@/modules/git/pages/repository-detail-page';
import { RepositorySettingsPage } from '@/modules/git/pages/repository-settings-page';
import { AnalyticsPage } from '@/modules/analytics/pages/analytics-page';
import { DocumentsPage } from '@/modules/document/pages/documents-page';
import { DocumentViewPage } from '@/modules/document/pages/document-view-page';
import { DocumentEditPage } from '@/modules/document/pages/document-edit-page';
import { DocumentNewPage } from '@/modules/document/pages/document-new-page';
import { DesktopInitPage } from '@/modules/desktop/pages/desktop-init-page';
import { BootPage } from '@/modules/boot/pages/boot-page';
import { TasksPage } from '@/modules/task/pages/tasks-page';
import { BugsPage } from '@/modules/task/pages/bugs-page';
import { TaskDetailPage } from '@/modules/task/pages/task-detail-page';
import { BugDetailPage } from '@/modules/task/pages/bug-detail-page';
import { AcceptanceDetailPage } from '@/modules/acceptance/pages/acceptance-detail-page';
import { AcceptanceListPage } from '@/modules/acceptance/pages/acceptance-list-page';
import { ExecutionsPage } from '@/modules/executions/pages/executions-page';
import { HelpPage } from '@/modules/help/pages/help-page';
import { SearchPage } from '@/modules/search/pages/search-page';
import ProjectRolesPage from '@/modules/project-role/pages/project-roles-page';

/**
 * 旧 AI / 集成页面路由已迁入设置页（2026-08-19）。
 * 旧路径保留重定向以兼容书签与历史跳转，保留 query 参数（如 ?tab= 深链）
 * 与 location.state（命令面板的 initialPrompt 等）。
 */
function RedirectToSettings({ to }: { to: string }) {
  const { search, state } = useLocation();
  return <Navigate to={{ pathname: to, search }} state={state} replace />;
}

/** 旧 Linear 集成详情路径重定向（携带动态 integrationId） */
function LinearIntegrationRedirect() {
  const { integrationId } = useParams<{ integrationId: string }>();
  return (
    <Navigate to={`/app/settings/integrations/linear/${integrationId ?? ''}`} replace />
  );
}

function ProjectTasksRedirect() {
  return <Navigate to="../board" replace />;
}

const DesignSystemPage = lazy(() =>
  import('@/modules/design-system/pages/design-system-page').then((m) => ({
    default: m.DesignSystemPage,
  })),
);

const DeliveryPage = lazy(() =>
  import('@/modules/delivery/pages/delivery-page').then((m) => ({
    default: m.DeliveryPage,
  })),
);

const MembersPage = lazy(() =>
  import('@/modules/team-member/pages/members-page'),
);
const TeamsPage = lazy(() =>
  import('@/modules/team-member/pages/teams-page'),
);
const MemberDetailPage = lazy(() =>
  import('@/modules/team-member/pages/member-detail-page'),
);

const TeamDetailPage = lazy(() =>
  import('@/modules/team-member/pages/team-detail-page'),
);

export const router = createBrowserRouter([
  // Boot startup page (first screen shown on cold start)
  {
    path: '/boot',
    element: <BootPage />,
    errorElement: <ErrorPage />,
  },
  // Desktop initialization page
  {
    path: '/desktop/init',
    element: <DesktopInitPage />,
    errorElement: <ErrorPage />,
  },
  // Redirect root path to boot so users see the startup screen first
  {
    path: '/',
    element: <Navigate to="/boot" replace />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/register',
    lazy: () => import('@/modules/auth/pages/register-page').then((m) => ({ Component: m.RegisterPage })),
    errorElement: <ErrorPage />,
  },
  {
    path: '/invite/:token',
    lazy: () => import('@/modules/auth/pages/invite-page').then((m) => ({ Component: m.InvitePage })),
    errorElement: <ErrorPage />,
  },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <ShellLayout />
      </AuthGuard>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <ProjectListPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'projects',
        errorElement: <ErrorPage />,
        children: [
          {
            index: true,
            element: <ProjectListPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId',
            element: <ProjectDashboardPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId/board',
            element: <ProjectBoardPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId/milestones',
            element: <ProjectMilestonesPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId/team',
            element: <ProjectTeamPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId/tasks',
            element: <ProjectTasksRedirect />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId/settings',
            element: <ProjectSettingsPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId/roles',
            element: <ProjectRolesPage />,
            errorElement: <ErrorPage />,
          },
        ],
      },
      // AI 页面已迁入设置页，旧路径重定向（原组件见 modules/ai-hub/pages，标记为暂时抛弃）
      {
        path: 'ai',
        element: <RedirectToSettings to="/app/settings/ai" />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'ai/executions',
        element: <RedirectToSettings to="/app/settings/ai/executions" />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'ai/agents',
        element: <RedirectToSettings to="/app/settings/ai/agents" />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'executions',
        element: <ExecutionsPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'ai/management',
        element: <RedirectToSettings to="/app/settings/ai" />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'tasks',
        element: <TasksPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'tasks/:taskId',
        element: <TaskDetailPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'bugs',
        element: <BugsPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'bugs/:bugId',
        element: <BugDetailPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'members',
        element: (
          <Suspense fallback={null}>
            <MembersPage />
          </Suspense>
        ),
        errorElement: <ErrorPage />,
      },
      {
        path: 'members/:memberId',
        element: (
          <Suspense fallback={null}>
            <MemberDetailPage />
          </Suspense>
        ),
        errorElement: <ErrorPage />,
      },
      {
        path: 'teams',
        element: (
          <Suspense fallback={null}>
            <TeamsPage />
          </Suspense>
        ),
        errorElement: <ErrorPage />,
      },
      {
        path: 'teams/:teamId',
        element: (
          <Suspense fallback={null}>
            <TeamDetailPage />
          </Suspense>
        ),
        errorElement: <ErrorPage />,
      },
      {
        path: 'acceptance',
        element: <AcceptanceListPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'acceptance/:id',
        element: <AcceptanceDetailPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'help',
        element: <HelpPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'notifications',
        element: <NotificationCenterPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'notification',
        element: <Navigate to="/app/notifications" replace />,
        errorElement: <ErrorPage />,
      },
      // 集成页面已迁入设置页，旧路径重定向（原组件见 modules/integration、modules/github、modules/linear，标记为暂时抛弃）
      {
        path: 'integrations',
        element: <RedirectToSettings to="/app/settings/integrations" />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'integrations/linear/:integrationId',
        element: <LinearIntegrationRedirect />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'integrations/github',
        element: <RedirectToSettings to="/app/settings/integrations/github" />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'plugins',
        element: <Navigate to="/app/settings/integrations" replace />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'plugin-center',
        element: <Navigate to="/app/settings/integrations" replace />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'repositories',
        errorElement: <ErrorPage />,
        children: [
          {
            index: true,
            element: <RepositoryListPage />,
          },
          {
            path: ':repoId',
            element: <RepositoryDetailPage />,
          },
          {
            path: ':repoId/settings',
            element: <RepositorySettingsPage />,
          },
        ],
      },
      // Terminal路由已废弃 - Terminal功能已并入Runtime模块的terminal capability
      {
        path: 'analytics',
        element: <AnalyticsPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'documents',
        element: <DocumentsPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'documents/new',
        element: <DocumentNewPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'documents/:documentId',
        element: <DocumentViewPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'documents/:documentId/edit',
        element: <DocumentEditPage />,
        errorElement: <ErrorPage />,
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: 'design-system',
              element: (
                <Suspense fallback={null}>
                  <DesignSystemPage />
                </Suspense>
              ),
              errorElement: <ErrorPage />,
            },
            {
              path: 'delivery',
              element: (
                <Suspense fallback={null}>
                  <DeliveryPage />
                </Suspense>
              ),
              errorElement: <ErrorPage />,
            },
          ]
        : []),
    ],
  },
  // 设置页为独立全屏路由（不嵌入 ShellLayout，无侧边栏与标签页）。
  // 各设置分区/AI/集成子页均注册为子路由，侧边栏分组配置见 modules/settings/settings-nav.ts
  {
    path: '/app/settings',
    element: (
      <AuthGuard>
        <SettingsPage />
      </AuthGuard>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/app/settings/appearance" replace /> },
      { path: 'appearance', element: <AppearanceSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'git', element: <GitSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'terminal', element: <TerminalSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'labels', element: <LabelsSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'statuses', element: <StatusesSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'roles', element: <RolesSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'templates', element: <TemplatesSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'short-id', element: <ShortIdSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'storage', element: <StorageSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'ai', element: <AiManagementSection />, errorElement: <ErrorPage /> },
      { path: 'ai/agents', element: <AiAgentsSection />, errorElement: <ErrorPage /> },
      { path: 'ai/executions', element: <AiExecutionCenterSection />, errorElement: <ErrorPage /> },
      { path: 'integrations', element: <IntegrationsSettingsSection />, errorElement: <ErrorPage /> },
      { path: 'integrations/github', element: <GithubIntegrationSection />, errorElement: <ErrorPage /> },
      {
        path: 'integrations/linear/:integrationId',
        element: <LinearIntegrationSection />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  // Fallback route for any unknown path with a friendly error page
  {
    path: '*',
    element: <ErrorPage />,
  },
]);
