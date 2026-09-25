import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { AuthVisualCard } from '../components/auth-visual-card';

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
    <AuthVisualCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="username"
            >
              {t('auth.username')}
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={t('auth.usernamePlaceholder') || '请输入账号或邮箱'}
              autoComplete="username"
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="password"
              >
                {t('auth.password')}
              </label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('auth.passwordPlaceholder') || '请输入密码'}
              autoComplete="current-password"
              className="h-10 text-sm"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-10 w-full text-sm font-medium shadow-xs"
        >
          {isLoading ? (
            <>
              <Spinner className="size-4 text-inherit mr-2" />
              {t('auth.loggingIn') || '正在验证中…'}
            </>
          ) : (
            t('auth.loginButton') || '登录 APM'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-1">
          没有账号？{' '}
          <Link
            to="/register"
            className="text-primary hover:underline font-medium"
          >
            邮箱注册
          </Link>
        </p>
      </form>
    </AuthVisualCard>
  );
}

export default LoginPage;
