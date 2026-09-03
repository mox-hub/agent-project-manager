import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/brand/logo';
import { authApi, type RegisterInvitePreview } from '../api/auth-api';

/**
 * 邮箱注册页：注册成功即登录（后端自动创建 User + human Member）。
 * 携带 ?invite=<token> 时为邀请注册：展示邀请人信息并随表单提交 token。
 */
export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<RegisterInvitePreview | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    authApi
      .previewRegisterInvite(inviteToken)
      .then((preview) => {
        setInvite(preview);
        if (preview.email) setEmail(preview.email);
      })
      .catch(() => {
        /* 预览失败不阻断：提交时后端会给出明确错误 */
      });
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.register({
        email,
        password,
        displayName: displayName || undefined,
        inviteToken: inviteToken || undefined,
      });
      localStorage.setItem('access_token', res.accessToken);
      window.location.href = '/app/projects';
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error?.message || '注册失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const inviteInvalid = invite && invite.status !== 'pending';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-75 space-y-6 rounded-lg border border-border bg-background p-8 shadow-md"
      >
        <div className="text-center">
          <Logo size="lg" variant="framed" className="mx-auto mb-3" ariaLabel="Agent Project Manager" />
          <h1 className="mb-1 text-2xl font-bold text-foreground">Agent Project Manager</h1>
          <h2 className="mt-3 text-lg text-muted-foreground">
            {inviteToken ? '受邀注册' : '邮箱注册'}
          </h2>
        </div>

        {invite && (
          <div
            className={`rounded-md px-3 py-2 text-xs ${
              inviteInvalid
                ? 'bg-accent-red/10 text-accent-red'
                : 'bg-accent-blue/10 text-accent-blue'
            }`}
          >
            {inviteInvalid
              ? '该邀请已失效，请联系管理员重新发送。'
              : `${invite.inviterName} 邀请你注册${
                  invite.email ? `（受邀邮箱：${invite.email}）` : ''
                }`}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
          />
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="姓名（可选）"
            autoComplete="name"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 8 位）"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="确认密码"
            required
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || Boolean(inviteInvalid)}
        >
          {submitting ? (
            <>
              <Spinner className="size-4 text-inherit" />
              注册中…
            </>
          ) : (
            '注册并登录'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          已有账号？{' '}
          <Link to="/login" className="text-primary hover:underline">
            返回登录
          </Link>
        </p>
      </form>
    </div>
  );
}
