/**
 * ExecutionRunPanel - 任务详情页执行运行面板
 *
 * 显示该任务最近的执行历史，订阅 WS 事件实时更新。
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Play, CheckCircle2, XCircle, Clock, Loader2, Terminal } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useExecutionRunsByTask } from '@/modules/execution/hooks/use-execution';
import { eventClient } from '@/infrastructure/event-client';

interface ExecutionRunPanelProps {
  taskId: string;
}

const STATUS_CONFIG = {
  pending: { labelKey: 'taskDetail.execPending', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  in_progress: { labelKey: 'taskDetail.execRunning', icon: Loader2, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  completed: { labelKey: 'taskDetail.execCompleted', icon: CheckCircle2, color: 'text-accent-green', bg: 'bg-accent-green/10' },
  failed: { labelKey: 'taskDetail.execFailed', icon: XCircle, color: 'text-accent-red', bg: 'bg-accent-red/10' },
  cancelled: { labelKey: 'taskDetail.execCancelled', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted/50' },
} as const;

function formatTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(startedAt?: string, completedAt?: string) {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${mins}m ${s}s` : `${mins}m`;
}

export function ExecutionRunPanel({ taskId }: ExecutionRunPanelProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: runs = [], isLoading } = useExecutionRunsByTask(taskId);

  // Subscribe to execution.completed WS event to refresh runs in real-time
  useEffect(() => {
    const handleCompleted = (payload: { taskId: string; executionRunId: string; status: string }) => {
      if (payload.taskId !== taskId) return;
      // Refresh the query when execution completes
      qc.invalidateQueries({ queryKey: ['execution', 'runs', 'task', taskId] });
    };

    eventClient.on('execution.completed', handleCompleted);
    return () => {
      eventClient.off('execution.completed', handleCompleted);
    };
  }, [taskId, qc]);

  // Show only latest run for compact display
  const latestRun = runs[0];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground text-sm">
        <Spinner className="size-3.5 text-inherit" />
        {t('taskDetail.execLoading')}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground text-sm">
        <Terminal size={14} />
        {t('taskDetail.execEmpty')}
      </div>
    );
  }

  const cfg = STATUS_CONFIG[latestRun.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const duration = formatDuration(latestRun.startedAt, latestRun.completedAt);

  return (
    <div className="space-y-2">
      {/* Latest run status */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${cfg.bg}`}>
        <StatusIcon size={14} className={`shrink-0 ${cfg.color} ${latestRun.status === 'in_progress' ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${cfg.color}`}>{t(cfg.labelKey)}</span>
            <Badge variant="outline" className="text-10 font-mono">
              {latestRun.id.slice(0, 12)}…
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-11 text-muted-foreground">
            {latestRun.startedAt && <span>{formatTime(latestRun.startedAt)}</span>}
            {duration && <span>{duration}</span>}
            {latestRun.completedAt && latestRun.status !== 'in_progress' && (
              <span>{t('taskDetail.execFinishedAt', { time: formatTime(latestRun.completedAt) })}</span>
            )}
          </div>
        </div>
        {latestRun.status === 'in_progress' && (
          <Play size={12} className="text-accent-blue shrink-0" />
        )}
      </div>

      {/* All runs summary */}
      {runs.length > 1 && (
        <div className="text-11 text-muted-foreground px-1">
          {t('taskDetail.execSummary', { count: runs.length, status: t(cfg.labelKey) })}
        </div>
      )}

      {/* Error detail */}
      {latestRun.status === 'failed' && latestRun.error && (
        <div className="text-11 text-accent-red px-1 truncate" title={latestRun.error}>
          {t('taskDetail.execError', { message: latestRun.error })}
        </div>
      )}
    </div>
  );
}
