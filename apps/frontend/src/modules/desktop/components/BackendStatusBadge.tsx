import { useDesktop } from '../hooks/useDesktop';

export interface BackendStatusBadgeProps {
  showControls?: boolean;
}

export function BackendStatusBadge({ showControls = true }: BackendStatusBadgeProps) {
  const {
    backendStatus,
    isLoading,
    error,
    isDesktop,
    startBackend,
    stopBackend,
    restartBackend,
  } = useDesktop();

  if (!isDesktop) {
    return null;
  }

  const isRunning = backendStatus?.running ?? false;
  const port = backendStatus?.info?.port;
  const pid = backendStatus?.info?.pid;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${isRunning ? 'bg-accent-green' : 'bg-muted-foreground/40'}`}
        />
        <span className="text-sm text-muted-foreground">
          {isRunning ? '后端运行中' : '后端已停止'}
        </span>
        {isRunning && port && (
          <span className="text-xs text-muted-foreground">:{port}</span>
        )}
      </div>

      {showControls && (
        <div className="flex items-center gap-1">
          {isRunning ? (
            <>
              <button
                onClick={restartBackend}
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="重启后端"
              >
                重启
              </button>
              <button
                onClick={stopBackend}
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                title="停止后端"
              >
                停止
              </button>
            </>
          ) : (
            <button
              onClick={startBackend}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="启动后端"
            >
              启动
            </button>
          )}
        </div>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
