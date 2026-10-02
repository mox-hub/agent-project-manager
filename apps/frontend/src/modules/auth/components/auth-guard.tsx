import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/use-auth';

/**
 * 路由鉴权门。三态判定而非二元（有/无登录态）：
 *
 * 1. 本地无登录态 → /login（真未登录）
 * 2. 有登录态但后端明确拒绝（401/403）→ /login（会话确实失效）
 * 3. 有登录态、校验因传输原因未成功（网络/超时/5xx/异源后端/壳后端未就绪）
 *    → 就地提示 + 重试，**绝不跳 /login**
 *
 * 第 3 态是实机「登录后自动弹出到登录页」的关键：跳 /login 会挂载认证面，
 * 其紧凑窗钩子把手机关切到认证窗，用户看到的就是「刚登录又被弹到登录页」。
 * 由一次瞬时抖动（后端重启/端口漂移）触发误判，代价完全不成比例。
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasToken, authRejected, authError, refetchAuth } =
    useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasToken || authRejected) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthenticated) {
    return (
      <div
        role="alert"
        className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">Couldn&apos;t verify your session.</p>
        {authError?.message ? (
          <p className="max-w-md text-xs text-muted-foreground/70">{authError.message}</p>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => void refetchAuth()}>
          Retry
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
