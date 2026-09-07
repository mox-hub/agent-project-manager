import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth-api';
import type { LoginRequest } from '../api/auth-api';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setCurrentUser } = useAppStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      const { accessToken, user } = data;
      localStorage.setItem('access_token', accessToken);
      setCurrentUser(user);
      queryClient.setQueryData(['auth', 'me'], data);
      navigate('/app');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      localStorage.removeItem('access_token');
      setCurrentUser(null);
      queryClient.clear();
      navigate('/login');
    },
  });

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getCurrentUser(),
    retry: false,
    enabled: !!localStorage.getItem('access_token'),
  });

  const roles = currentUser?.roles || [];

  return {
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isPending || logoutMutation.isPending || isLoading,
    currentUser: currentUser?.user || null,
    roles,
    // 与服务端 RolesGuard 口径对齐（admin/maintainer 可管理），用于隐藏普通用户必 403 的管理入口
    isAdmin: roles.some((r) => r.role === 'admin' || r.role === 'maintainer'),
    isAuthenticated: !!currentUser,
  };
}
