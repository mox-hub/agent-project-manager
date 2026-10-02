import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { AuthVisualCard } from '../components/auth-visual-card';
import { LoginWorkspacePicker } from '../components/login-workspace-picker';
import {
  getCurrentWorkspaceId,
  setWorkspaceSelection,
} from '@/modules/workspace/api/workspace-api';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
  USER_INACTIVE: 'auth.errors.userInactive',
  // 「凭证正确但当前工作区里没有这个账号」（CAP-A-25 ⑤）：可行动，必须与密码错误区分开
  WORKSPACE_SUBJECT_MISSING: 'auth.errors.workspaceSubjectMissing',
};

/** api-client 拦截器把后端错误信封转成顶层 code/status 的 ApiClientError */
type ApiClientErrorLike = { code?: string; status?: number; message?: string };

export function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // 目标工作区（CAP-A-26）：默认取本机当前选择，用户可在登录前显式改变。
  const [workspaceId, setWorkspaceId] = useState(getCurrentWorkspaceId());
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();

  /**
   * 选择工作区即写成本机的「当前工作区选择」——登录请求由 api-client 据此注入
   * `x-workspace-id`（这正是此前被隐形本地值决定、用户看不见也改不了的那一环）。
   * 选择本身不触发重载（与登录后的 switchWorkspace 不同）。
   */
  const handleWorkspaceChange = (id: string, name?: string) => {
    setWorkspaceId(id);
    setWorkspaceSelection(id, name);
  };

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
          <LoginWorkspacePicker
            value={workspaceId}
            onChange={handleWorkspaceChange}
            disabled={isLoading}
          />

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
