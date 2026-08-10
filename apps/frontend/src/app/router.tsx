import { createBrowserRouter, Navigate } from 'react-router-dom';
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
import { AIManagementPage } from '@/modules/ai-hub/pages/ai-management-page';
import { AIExecutionCenterPage } from '@/modules/ai-hub/pages/ai-execution-center-page';
import { AgentManagementPage } from '@/modules/ai-hub/pages/agent-management-page';
// TerminalPage 已废弃 - Terminal模块已并入Runtime模块的terminal capability
import { SettingsPage } from '@/modules/settings/pages/settings-page';
import { ProjectSettingsPage } from '@/modules/project/pages/project-settings-page';
import { NotificationCenterPage } from '@/modules/notification/pages/notification-center-page';
import { IntegrationListPage } from '@/modules/integration/pages/integration-list-page';
import { LinearIntegrationDetailPage } from '@/modules/linear/pages/linear-integration-detail-page';
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

function ProjectTasksRedirect() {
  return <Navigate to="../board" replace />;
}

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
      {
        path: 'ai',
        element: <AIManagementPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'ai/executions',
        element: <AIExecutionCenterPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'ai/agents',
        element: <AgentManagementPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'executions',
        element: <ExecutionsPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'ai/management',
        element: <Navigate to="/app/ai" replace />,
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
      {
        path: 'integrations',
        element: <IntegrationListPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'integrations/linear/:integrationId',
        element: <LinearIntegrationDetailPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'plugins',
        element: <Navigate to="/app/integrations" replace />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'plugin-center',
        element: <Navigate to="/app/integrations" replace />,
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
      {
        path: 'settings',
        element: <SettingsPage />,
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
