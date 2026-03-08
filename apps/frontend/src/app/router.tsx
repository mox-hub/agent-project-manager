import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/modules/auth/pages/login-page';
import { AuthGuard } from '@/modules/auth/components/auth-guard';
import { ShellLayout } from '@/shared/layout/shell-layout';
import { ProjectListPage } from '@/modules/project/pages/project-list-page';
import { ProjectDashboardPage } from '@/modules/project/pages/project-dashboard-page';
import { DashboardPage } from '@/modules/project/pages/dashboard-page';
import { TaskPage } from '@/modules/task/pages/task-page';
import { ErrorPage } from '@/shared/pages/error-page';
import { AISpacePage } from '@/modules/ai-hub/pages/ai-space-page';
import { TerminalPage } from '@/modules/terminal/pages/terminal-page';
import { SettingsPage } from '@/modules/settings/pages/settings-page';
import { ProjectSettingsPage } from '@/modules/project/pages/project-settings-page';

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
        path: 'terminal',
        element: <TerminalPage />,
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
