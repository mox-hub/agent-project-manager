import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '../components/auth-shell';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/shared/components/language-switcher';
import { persistTokenToShell } from '@/shared/lib/desktop-session';
import { authApi, type RegisterInvitePreview } from '../api/auth-api';

/** api-client 拦截器把后端错误信封转成顶层 code/status 的 ApiClientError */
type ApiClientErrorLike = { code?: string; status?: number; message?: string };

/**
 * 邮箱注册页：注册成功即登录（后端自动创建 User + human Member）。
 * 携带 ?invite=<token> 时为邀请注册：展示邀请人信息并随表单提交 token。
 * 成功后进欢迎页 /welcome 亮身份工牌（CAP-A-22），不再直落工作台。
 */
export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
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
      persistTokenToShell(res.accessToken);
      navigate('/welcome', { state: { registeredAt: new Date().toISOString() } });
    } catch (err) {
      const apiError = err as ApiClientErrorLike;
      if (
        apiError.code === 'EMAIL_ALREADY_REGISTERED' ||
        apiError.status === 409
      ) {
        setError(t('auth.errors.emailAlreadyRegistered'));
      } else {
        setError(apiError.message || t('auth.registerFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inviteInvalid = invite && invite.status !== 'pending';

  return (
    <AuthShell
      header={<Logo size="lg" variant="framed" ariaLabel="Agent Project Manager" />}
      footer={
        <>
          <span className="text-xs text-muted-foreground">{t('auth.troubleLogin')}</span>
          <LanguageSwitcher compact showFlag={false} />
        </>
      }
    >
      <h1 className="text-2xl font-semibold text-foreground">
        {inviteToken ? t('auth.registerInviteTitle') : t('auth.registerHeading')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t('auth.registerIntro')}
      </p>

      {invite && (
        <div
          className={`mt-6 rounded-md px-3 py-2 text-xs ${
            inviteInvalid
              ? 'bg-accent-red/10 text-accent-red'
              : 'bg-accent-blue/10 text-accent-blue'
          }`}
        >
          {inviteInvalid
            ? t('auth.inviteInvalid')
            : t('auth.inviteBy', { name: invite.inviterName }) +
              (invite.email
                ? t('auth.inviteEmail', { email: invite.email })
                : '')}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
          placeholder={t('auth.displayNamePlaceholder')}
          autoComplete="name"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.passwordHint')}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          required
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full" disabled={submitting || Boolean(inviteInvalid)}>
          {submitting ? (
            <>
              <Spinner className="size-4 text-inherit" />
              {t('auth.registering')}
            </>
          ) : (
            t('auth.registerSubmit')
          )}
        </Button>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="text-primary hover:underline">
          {t('auth.toLogin')}
        </Link>
      </p>
    </AuthShell>
  );
}
