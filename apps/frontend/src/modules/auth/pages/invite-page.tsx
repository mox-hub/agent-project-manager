import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Logo } from '@/components/brand/logo';
import { authApi, type InvitePreview } from '../api/auth-api';
import { useAuth } from '../hooks/use-auth';
import { ApiClientError } from '@/shared/types/api';

/**
 * 从错误里取可展示文案。
 *
 * 注意：`api.get/post` 抛的是 api-client 拦截器转换后的 `ApiClientError`（顶层
 * code/status/message），**不是** axios 原始错误——没有 `response.data`。
 * 原先按 `err.response?.data?.error?.message` 读，恒为 undefined，于是所有失败
 * （含「邀请不存在」「邮箱不匹配」）都退化成兜底文案，属于静默失修。
 */
function inviteErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    return err.message || fallback;
  }
  return fallback;
}

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
      .catch((err: unknown) => {
        setError(inviteErrorMessage(err, '邀请不存在或已失效'));
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
      setError(inviteErrorMessage(err, '接受邀请失败'));
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
    <div className="flex min-h-screen items-center justify-center bg-background" data-ai-page="auth-invite">
      <div className="w-full max-w-90 space-y-6 rounded-lg border border-border bg-background p-8 shadow-xs">
        <div className="text-center">
          <Logo size="lg" variant="framed" className="mx-auto mb-3" ariaLabel="Agent Project Manager" />
          <h1 className="text-xl font-semibold text-foreground">团队邀请</h1>
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
                {/* 宪法 §10.7：组合唯一方式为 render prop（旧 Radix 组合写法已禁）；
                    render 到 <Link> 非原生 button，须显式 nativeButton={false}（同 ui/pagination） */}
                <Button
                  className="w-full"
                  nativeButton={false}
                  render={<Link to={`/login?next=/invite/${token}`} />}
                >
                  登录后接受
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  nativeButton={false}
                  render={<Link to={`/register?invite=${token}`} />}
                >
                  没有账号？注册
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
