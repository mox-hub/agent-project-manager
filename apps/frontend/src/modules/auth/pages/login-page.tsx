import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <form onSubmit={handleSubmit} className="w-full max-w-[300px] space-y-6 rounded-lg border border-border bg-background p-8 shadow-md">
        <div className="text-center">
          <h1 className="mb-1 text-2xl font-bold text-foreground">Agent Project Manager</h1>
          <h2 className="text-lg text-muted-foreground">{t("auth.login")}</h2>
        </div>

        {error && (
          <div className="rounded-md bg-accent-red/10 p-3 text-sm text-accent-red">
            {error}
          </div>
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
          {isLoading ? t("auth.loggingIn") || 'Logging in...' : t("auth.loginButton")}
        </Button>
      </form>
    </div>
  );
}
