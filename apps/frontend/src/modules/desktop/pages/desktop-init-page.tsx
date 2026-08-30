import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesktop } from '@/modules/desktop';
import { isTauriAvailable } from '@/shared/types/electron-api';
import { Spinner } from '@/components/ui/spinner';

export function DesktopInitPage() {
  const navigate = useNavigate();
  const { backendStatus, isLoading, error, isDesktop, startBackend } = useDesktop();
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop) {
      navigate('/login', { replace: true });
      return;
    }

    if (backendStatus?.running && backendStatus?.info?.apiBaseUrl) {
      navigate('/login', { replace: true });
    }
  }, [isDesktop, backendStatus, navigate]);

  const handleStartBackend = async () => {
    setInitError(null);
    try {
      await startBackend();
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!isDesktop) {
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-foreground">Agent Project Manager</h1>
          <p className="text-sm text-muted-foreground">
            {backendStatus?.running
              ? '后端运行中，正在跳转...'
              : '桌面模式初始化中'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">后端状态</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  backendStatus?.running
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-muted/40 text-muted-foreground'
                }`}
              >
                <span
                  className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                    backendStatus?.running ? 'bg-accent-green' : 'bg-muted-foreground/40'
                  }`}
                />
                {backendStatus?.running ? '运行中' : '已停止'}
              </span>
            </div>

            {backendStatus?.running && backendStatus?.info && (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>端口</span>
                  <span className="font-mono text-foreground">{backendStatus.info.port}</span>
                </div>
                <div className="flex justify-between">
                  <span>API 地址</span>
                  <span className="font-mono text-foreground">
                    {backendStatus.info.apiBaseUrl}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>进程 ID</span>
                  <span className="font-mono text-foreground">{backendStatus.info.pid}</span>
                </div>
              </div>
            )}
          </div>

          {initError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{initError}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!backendStatus?.running && (
            <button
              type="button"
              onClick={handleStartBackend}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 size-4 text-inherit" />
                  启动中...
                </>
              ) : (
                '启动后端服务'
              )}
            </button>
          )}

          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              桌面模式下，应用需要启动内置后端服务来处理 Git 仓库操作、数据库访问等功能。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
