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
import { TaskPage } from '@/modules/task/pages/task-page';
import { ErrorPage } from '@/shared/pages/error-page';
import { AISpacePage } from '@/modules/ai-hub/pages/ai-space-page';
import { TerminalPage } from '@/modules/terminal/pages/terminal-page';
import { SettingsPage } from '@/modules/settings/pages/settings-page';
import { ProjectSettingsPage } from '@/modules/project/pages/project-settings-page';
import { MetadataSettingsPage } from '@/modules/core-config/pages/metadata-settings-page';
import { NotificationCenterPage } from '@/modules/notification/pages/notification-center-page';
import { IntegrationListPage } from '@/modules/integration/pages/integration-list-page';
import { RepositoryListPage } from '@/modules/git/pages/repository-list-page';
import { AnalyticsPage } from '@/modules/analytics/pages/analytics-page';
import { DocumentsPage } from '@/modules/document/pages/documents-page';
import { DocumentViewPage } from '@/modules/document/pages/document-view-page';
import { DocumentEditPage } from '@/modules/document/pages/document-edit-page';

export const router = createBrowserRouter([
  // Redirect root path to login so users see a proper login page instead of a 404
  {
    path: '/',
    element: <Navigate to="/login" replace />,
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
            element: <TaskPage />,
            errorElement: <ErrorPage />,
          },
          {
            path: ':projectId/settings',
            element: <ProjectSettingsPage />,
            errorElement: <ErrorPage />,
          },
        ],
      },
      {
        path: 'ai',
        element: <AISpacePage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'notifications',
        element: <NotificationCenterPage />,
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
        element: <RepositoryListPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'terminal',
        element: <TerminalPage />,
        errorElement: <ErrorPage />,
      },
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
      {
        path: 'settings/metadata',
        element: <MetadataSettingsPage />,
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
