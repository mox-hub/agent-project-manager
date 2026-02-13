import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../modules/auth/pages/login-page';
import { AuthGuard } from '../modules/auth/components/auth-guard';
import { ShellLayout } from '../shared/layout/shell-layout';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <ShellLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <div>Project List (Coming soon)</div>,
      },
    ],
  },
]);
