import * as React from 'react';
import { useSyncLogs } from '../hooks/use-linear-sync';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { LinearIcon } from '@/components/icons/linear';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface LinearSyncLogProps {
  integrationId: string;
  limit?: number;
  className?: string;
}

const STATUS_ICON = {
  success: CheckCircle2,
  failed: XCircle,
  conflict: AlertCircle,
} as const;

const STATUS_COLOR = {
  success: 'text-emerald-400',
  failed: 'text-rose-400',
  conflict: 'text-orange-400',
} as const;

export function LinearSyncLog({
  integrationId,
  limit = 20,
  className,
}: LinearSyncLogProps) {
  const { data, isLoading, isFetching } = useSyncLogs(integrationId);
  const logs = (data ?? []).slice(0, limit);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-medium">
          <LinearIcon size={14} /> Sync history
        </h4>
        {isFetching ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <RefreshCw
            className="size-3.5 text-muted-foreground/50"
            aria-hidden
          />
        )}
      </div>
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading logs…</div>
      ) : logs.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No sync history yet. Trigger a sync to get started.
        </div>
      ) : (
        <ul className="space-y-1">
          {logs.map((log) => {
            const Icon = STATUS_ICON[log.status] ?? CheckCircle2;
            return (
              <li
                key={log.id}
                className="flex items-start gap-2 rounded-md border bg-muted/20 p-2"
              >
                <Icon
                  className={cn(
                    'mt-0.5 size-3.5 shrink-0',
                    STATUS_COLOR[log.status],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium uppercase tracking-wide text-muted-foreground">
                      {log.action}
                    </span>
                    <span className="rounded bg-muted/50 px-1 py-0.5 text-10 font-mono">
                      {log.resourceType}
                    </span>
                  </div>
                  {log.message ? (
                    <p className="mt-0.5 text-xs text-foreground/80 line-clamp-2">
                      {log.message}
                    </p>
                  ) : null}
                </div>
                <time className="shrink-0 text-10 text-muted-foreground">
                  {formatDistanceToNow(new Date(log.createdAt), {
                    addSuffix: true,
                  })}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
