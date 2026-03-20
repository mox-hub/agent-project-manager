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
    onSuccess: (response) => {
      const { accessToken, user } = response.data;
      localStorage.setItem('access_token', accessToken);
      setCurrentUser(user);
      queryClient.setQueryData(['auth', 'me'], response.data);
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
    queryFn: async () => {
      const response = await authApi.getCurrentUser();
      setCurrentUser(response.data.user);
      return response.data;
    },
    retry: false,
    enabled: !!localStorage.getItem('access_token'),
  });

  return {
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isPending || logoutMutation.isPending || isLoading,
    currentUser: currentUser?.user || null,
    roles: currentUser?.roles || [],
    isAuthenticated: !!currentUser,
  };
}
