import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { authApi, type RegisterInvitePreview } from '../api/auth-api';
import { AuthVisualCard } from '../components/auth-visual-card';

/** api-client 拦截器把后端错误信封转成顶层 code/status 的 ApiClientError */
type ApiClientErrorLike = { code?: string; status?: number; message?: string };

/**
 * 邮箱注册页：注册成功即登录（后端自动创建 User + human Member）。
 * 携带 ?invite=<token> 时为邀请注册：展示邀请人信息并随表单提交 token。
 */
export function RegisterPage() {
  const { t } = useTranslation();
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
      const apiError = err as ApiClientErrorLike;
      if (
        apiError.code === 'EMAIL_ALREADY_REGISTERED' ||
        apiError.status === 409
      ) {
        setError(t('auth.errors.emailAlreadyRegistered'));
      } else {
        setError(apiError.message || '注册失败，请稍后再试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inviteInvalid = invite && invite.status !== 'pending';

  return (
    <AuthVisualCard isRegister>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {invite && (
          <div
            className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
              inviteInvalid
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {inviteInvalid
              ? '该邀请已失效，请联系管理员重新发送。'
              : `${invite.inviterName} 邀请你加入 APM 团队${
                  invite.email ? `（受邀邮箱：${invite.email}）` : ''
                }`}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2.5">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
            className="h-9.5 text-sm"
          />
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="姓名（可选）"
            autoComplete="name"
            className="h-9.5 text-sm"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 8 位）"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-9.5 text-sm"
          />
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="确认密码"
            required
            autoComplete="new-password"
            className="h-9.5 text-sm"
          />
        </div>

        <Button
          type="submit"
          className="h-10 w-full text-sm font-medium shadow-xs"
          disabled={submitting || Boolean(inviteInvalid)}
        >
          {submitting ? (
            <>
              <Spinner className="size-4 text-inherit mr-2" />
              注册并初始化…
            </>
          ) : (
            '注册并登录'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-1">
          已有账号？{' '}
          <Link
            to="/login"
            className="text-primary hover:underline font-medium"
          >
            返回登录
          </Link>
        </p>
      </form>
    </AuthVisualCard>
  );
}

export default RegisterPage;
