import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '../components/auth-shell';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/shared/components/language-switcher';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
  USER_INACTIVE: 'auth.errors.userInactive',
};

/** api-client 拦截器把后端错误信封转成顶层 code/status 的 ApiClientError */
type ApiClientErrorLike = { code?: string; status?: number; message?: string };

export function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    login(
      { username, password },
      {
        onError: (err: unknown) => {
          const apiError = err as ApiClientErrorLike;
          const errorKey = ERROR_MESSAGES[apiError.code || ''];
          setError(
            errorKey
              ? t(errorKey)
              : apiError.message || t('auth.errors.loginFailed'),
          );
        },
      },
    );
  };

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
      <h1 className="text-2xl font-semibold text-foreground">{t('auth.welcomeBack')}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t('auth.welcomeSubtitle')}
      </p>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="username">
            {t('auth.username')}
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder={t('auth.usernamePlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            {t('auth.password')}
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('auth.passwordPlaceholder')}
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Spinner className="size-4 text-inherit" />
              {t('auth.loggingIn')}
            </>
          ) : (
            t('auth.loginButton')
          )}
        </Button>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-primary hover:underline">
          {t('auth.toRegister')}
        </Link>
      </p>
    </AuthShell>
  );
}
