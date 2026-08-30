import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Logo } from '@/components/brand/logo';
import { authApi, type InvitePreview } from '../api/auth-api';
import { useAuth } from '../hooks/use-auth';

/**
 * 邀请落地页（公开路由）：
 * 预览邀请 → 已登录且邮箱匹配则直接接受；未登录跳登录/注册（回跳本页）。
 */
export function InvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    authApi
      .previewInvite(token)
      .then(setPreview)
      .catch((err: { response?: { data?: { error?: { message?: string } } } }) => {
        setError(err.response?.data?.error?.message || '邀请不存在或已失效');
      });
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await authApi.acceptInvite(token);
      setAccepted(true);
      qc.invalidateQueries();
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error?.message || '接受邀请失败');
    } finally {
      setAccepting(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: '待接受',
    accepted: '已接受',
    revoked: '已撤销',
    expired: '已过期',
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-90 space-y-6 rounded-lg border border-border bg-background p-8 shadow-md">
        <div className="text-center">
          <Logo size="lg" variant="framed" className="mx-auto mb-3" ariaLabel="Agent Project Manager" />
          <h1 className="text-xl font-bold text-foreground">团队邀请</h1>
        </div>

        {error && !preview && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="rounded-md border border-border p-4 text-sm">
              <p className="text-muted-foreground">{preview.inviterName} 邀请你加入</p>
              <p className="mt-1 text-lg font-semibold">{preview.teamName}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                身份：{preview.role} · 面向邮箱：{preview.email || '任意'} · 状态：
                {statusLabel[preview.status] ?? preview.status}
              </p>
            </div>

            {accepted ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-accent-green">已加入「{preview.teamName}」！</p>
                <Button className="w-full" onClick={() => navigate('/app/teams')}>
                  查看我的团队
                </Button>
              </div>
            ) : preview.status !== 'pending' ? (
              <p className="text-center text-xs text-muted-foreground">
                该邀请已失效，请联系团队管理员重新发送。
              </p>
            ) : authLoading ? (
              <Spinner className="mx-auto size-4" />
            ) : isAuthenticated ? (
              <Button className="w-full" onClick={accept} disabled={accepting}>
                {accepting ? (
                  <>
                    <Spinner className="size-4 text-inherit" />
                    接受中…
                  </>
                ) : (
                  '接受邀请'
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button className="w-full" asChild>
                  <Link to={`/login?next=/invite/${token}`}>登录后接受</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/register?invite=${token}`}>没有账号？注册</Link>
                </Button>
              </div>
            )}

            {error && preview && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
