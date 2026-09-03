import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, RefreshCw, AlertCircle, GitBranch, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LinearSyncStatusBadge,
  LinearExternalRefBadge,
} from './linear-status-badge';
import { LinearConflictResolver } from './linear-conflict-resolver';
import {
  usePushCreateIssue,
  useSyncTasks,
} from '../hooks/use-linear-sync';
import type { SyncDirection } from '../api/linear-api';
import { cn } from '@/lib/utils';

interface TaskLinearPanelProps {
  taskId: string;
  task: {
    externalProvider?: string | null;
    externalIssueId?: string | null;
    externalIdentifier?: string | null;
    externalUrl?: string | null;
    syncStatus?: 'synced' | 'pending' | 'error' | 'conflict' | null;
    lastExternalSyncAt?: string | null;
  };
  projectId: string;
}

export function TaskLinearPanel({ taskId, task, projectId }: TaskLinearPanelProps) {
  const { t } = useTranslation();
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
  const pushCreate = usePushCreateIssue();
  const syncTasks = useSyncTasks();

  const isLinked = !!task.externalIssueId;
  const isLinear = task.externalProvider === 'linear' || (!task.externalProvider && isLinked);
  const hasConflict = task.syncStatus === 'conflict';

  if (!isLinear) {
    // 未关联到 Linear, 提供 push-create 入口
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="size-3.5" />
            <span>{t('linearSync.notLinked')}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-11"
            disabled={pushCreate.isPending}
            onClick={() => setPushConfirmOpen(true)}
            data-ai-component="task.linear.push-create"
            data-ai-action="task.linear.push-create.click"
          >
            <Send className="mr-1 size-3" />
            {t('linearSync.push')}
          </Button>
        </div>

        <Dialog open={pushConfirmOpen} onOpenChange={setPushConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('linearSync.pushTitle')}</DialogTitle>
              <DialogDescription>
                {t('linearSync.pushDesc')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPushConfirmOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={pushCreate.isPending}
                onClick={async () => {
                  try {
                    await pushCreate.mutateAsync({ projectId, localTaskId: taskId });
                    setPushConfirmOpen(false);
                  } catch {
                    /* toast handled in hook */
                  }
                }}
              >
                {pushCreate.isPending ? t('linearSync.pushing') : t('linearSync.push')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const handleSyncThis = () => {
    syncTasks.mutate({
      projectId,
      direction: 'two-way' as SyncDirection,
      taskIds: [taskId],
    });
  };

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <LinearExternalRefBadge
            identifier={task.externalIdentifier ?? task.externalIssueId ?? null}
            url={task.externalUrl ?? null}
          />
        </div>
        <LinearSyncStatusBadge status={task.syncStatus} />
      </div>

      {task.externalUrl ? (
        <a
          href={task.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-11 text-brand-linear underline-offset-2 hover:underline"
        >
          <ExternalLink className="size-3" /> {t('linearSync.openInLinear')}
        </a>
      ) : null}

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-6 flex-1 px-2 text-11"
          disabled={syncTasks.isPending}
          onClick={handleSyncThis}
        >
          <RefreshCw
            className={cn(
              'mr-1 size-3',
              syncTasks.isPending && 'animate-spin',
            )}
          />
          {t('linearSync.syncNow')}
        </Button>

        {hasConflict ? (
          <LinearConflictResolver taskId={taskId} compact />
        ) : null}
      </div>

      {task.lastExternalSyncAt ? (
        <div className="text-10 text-muted-foreground">
          {t('linearSync.lastSync', { time: new Date(task.lastExternalSyncAt).toLocaleString() })}
        </div>
      ) : null}

      {task.syncStatus === 'error' ? (
        <TooltipProvider>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 text-11 text-destructive">
                <AlertCircle className="size-3" /> {t('linearSync.error')}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                {t('linearSync.syncErrorTip')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
