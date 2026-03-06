import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: '用户名或密码错误',
  USER_INACTIVE: '账号已被禁用，请联系管理员',
};

export function LoginPage() {
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

          setError(ERROR_MESSAGES[errorCode || ''] || errorMessage || '登录失败，请稍后重试');
        },
      },
    );
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSubmit} style={{ width: '300px' }}>
        <h1>Agent Project Manager</h1>
        <h2>Login</h2>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        <div style={{ marginBottom: '10px' }}>
          <label>
            Username:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '5px' }}
            />
          </label>
        </div>
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px' }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
