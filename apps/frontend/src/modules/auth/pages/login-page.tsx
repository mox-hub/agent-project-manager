import { FieldLabel } from '@/components/ui/field';
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
    <AuthVisualCard aiPage="auth-login">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel size="xs" variant="muted"
              
              htmlFor="username"
            >
              {t('auth.username')}
            </FieldLabel>
            <Input size="h-10"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={t('auth.usernamePlaceholder') || '请输入账号或邮箱'}
              autoComplete="username"
              
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel size="xs" variant="muted"
                
                htmlFor="password"
              >
                {t('auth.password')}
              </FieldLabel>
            </div>
            <Input size="h-10"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('auth.passwordPlaceholder') || '请输入密码'}
              autoComplete="current-password"
              
            />
          </div>
        </div>

        <Button width="full"
          type="submit"
          disabled={isLoading}
          size="lg" 
        >
          {isLoading ? (
            <>
              <Spinner size="sm" color="inherit" className="mr-2" />
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
