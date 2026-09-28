import { Button } from '@/components/ui/button';

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
              <Button
                variant="quiet"
                fontSize="xs"
                padding="p-0"
                onClick={restartBackend}
                disabled={isLoading}
                title="重启后端"
              >
                重启
              </Button>
              <Button variant="ghost"
                onClick={stopBackend}
                disabled={isLoading}
                className="disabled:opacity-50"
                title="停止后端"
              >
                停止
              </Button>
            </>
          ) : (
            <Button
              variant="quiet"
              fontSize="xs"
              padding="p-0"
              onClick={startBackend}
              disabled={isLoading}
              title="启动后端"
            >
              启动
            </Button>
          )}
        </div>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
