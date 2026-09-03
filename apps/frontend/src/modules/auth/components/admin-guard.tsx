import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { toast } from '@/components/ui/toast';
import { useAuth } from '../hooks/use-auth';

/** 管理员路由守卫：等待角色加载完成后校验全局 admin 角色 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { roles, isLoading } = useAuth();

  const isAdmin = roles.some(
    (r) => r.scopeType === 'global' && r.role === 'admin',
  );

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast.error('需要管理员权限');
    }
  }, [isLoading, isAdmin]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
