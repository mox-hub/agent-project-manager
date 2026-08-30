import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/brand/logo';
import { useTranslation } from 'react-i18next';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
  USER_INACTIVE: 'auth.errors.userInactive',
};

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
          type ApiError = {
            response?: {
              data?: {
                error?: {
                  code?: string;
                  message?: string;
                };
              };
            };
          };

          const apiError = err as ApiError;
          const errorCode = apiError.response?.data?.error?.code;
          const errorMessage = apiError.response?.data?.error?.message;

          const errorKey = ERROR_MESSAGES[errorCode || ''];
          setError(errorKey ? t(errorKey) : errorMessage || t('auth.errors.loginFailed'));
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-75 space-y-6 rounded-lg border border-border bg-background p-8 shadow-md">
        <div className="text-center">
          <Logo size="lg" variant="framed" className="mx-auto mb-3" ariaLabel="Agent Project Manager" />
          <h1 className="mb-1 text-2xl font-bold text-foreground">Agent Project Manager</h1>
          <p className="text-xs text-muted-foreground">APM · AI 驱动的项目管理平台</p>
          <h2 className="mt-3 text-lg text-muted-foreground">{t("auth.login")}</h2>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="username">
              {t("auth.username")}
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={t("auth.usernamePlaceholder") || "Enter your username"}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              {t("auth.password")}
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t("auth.passwordPlaceholder") || "Enter your password"}
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Spinner className="size-4 text-inherit" />
              {t("auth.loggingIn") || 'Logging in...'}
            </>
          ) : (
            t("auth.loginButton")
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          没有账号？{' '}
          <Link to="/register" className="text-primary hover:underline">
            邮箱注册
          </Link>
        </p>
      </form>
    </div>
  );
}
