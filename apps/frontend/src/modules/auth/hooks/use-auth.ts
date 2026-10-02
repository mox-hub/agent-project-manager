import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth-api';
import type { LoginRequest } from '../api/auth-api';
import { consumeWorkspaceReset } from '@/infrastructure/api-client';
import { useAppStore } from '@/infrastructure/store/app-store';
import { persistTokenToShell } from '@/shared/lib/desktop-session';
import { toast } from '@/components/ui/toast';
import { ApiClientError } from '@/shared/types/api';
import { useNavigate } from 'react-router-dom';

/**
 * 鉴权性失败（会话确实失效）才允许踢回登录页。
 * 网络异常/超时/5xx/异源后端（BACKEND_MISMATCH，status=0）与桌面壳后端未就绪
 * （DESKTOP_API_BASE_UNAVAILABLE，status=0）都**不是**未登录——把瞬时故障判成未登录
 * 会清掉登录态并跳 /login，认证面随即弹出认证窗（实机「登录后自动弹出到登录页」根因）。
 */
function isAuthRejection(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) {
    return false;
  }
  return error.status === 401 || error.status === 403 || error.code === 'UNAUTHORIZED';
}

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setCurrentUser } = useAppStore();
  const { t } = useTranslation();

  /**
   * 数据面自愈（api-client 的「工作区作用域」处理）可能丢弃了与当前会话不同源的工作区
   * 选择——这是用户可见的状态变更（用户会发现自己回到了默认工作区），不能静默。
   * 用警告 toast 告知，但不打断流程、不要求确认：登录/会话恢复本身已经成功。
   */
  const notifyWorkspaceReset = useCallback(() => {
    const reset = consumeWorkspaceReset();
    if (!reset) {
      return;
    }
    toast.warning(t('auth.workspaceReset.title'), {
      description: t('auth.workspaceReset.hint', { id: reset.workspaceId }),
    });
  }, [t]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const result = await authApi.login(data);
      notifyWorkspaceReset();
      return result;
    },
    onSuccess: (data) => {
      const { accessToken, user } = data;
      localStorage.setItem('access_token', accessToken);
      persistTokenToShell(accessToken);
      setCurrentUser(user);
      queryClient.setQueryData(['auth', 'me'], data);
      navigate('/app');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      localStorage.removeItem('access_token');
      persistTokenToShell(null);
      setCurrentUser(null);
      queryClient.clear();
      navigate('/login');
    },
  });

  const hasToken =
    typeof window !== 'undefined' && !!localStorage.getItem('access_token');

  const {
    data: currentUser,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const me = await authApi.getCurrentUser();
      notifyWorkspaceReset();
      return me;
    },
    // 瞬时故障（壳/后端重启、网络抖动）退避重试以自愈；鉴权失败不重试（避免无谓往返）
    retry: (failureCount, err) => !isAuthRejection(err) && failureCount < 2,
    enabled: hasToken,
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
    /** 本地是否持有登录态（区分「没登录」与「登录态校验没跑成」） */
    hasToken,
    /** 后端是否明确拒绝该会话（401/403） */
    authRejected: isError && isAuthRejection(error),
    /** 非鉴权性失败（传输/就绪类），供调用方就地提示 + 重试，而非跳登录页 */
    authError: isError ? (error as Error) : null,
    refetchAuth: refetch,
  };
}
