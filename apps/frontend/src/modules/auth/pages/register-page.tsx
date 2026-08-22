import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/brand/logo';
import { authApi } from '../api/auth-api';

/**
 * 邮箱注册页：注册成功即登录（后端自动创建 User + human Member）。
 */
export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-75 space-y-6 rounded-lg border border-border bg-background p-8 shadow-md"
      >
        <div className="text-center">
          <Logo size="lg" variant="framed" className="mx-auto mb-3" ariaLabel="Agent Project Manager" />
          <h1 className="mb-1 text-2xl font-bold text-foreground">Agent Project Manager</h1>
          <h2 className="mt-3 text-lg text-muted-foreground">邮箱注册</h2>
        </div>

        {error && (
          <div className="rounded-md bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
            {error}
          </div>
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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '注册中…' : '注册并登录'}
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
