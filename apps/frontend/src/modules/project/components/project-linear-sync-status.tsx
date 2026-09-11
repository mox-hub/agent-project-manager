import * as React from 'react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Lock, ExternalLink, AlertCircle, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSyncTasks } from '@/modules/linear/hooks/use-linear-sync';
import { LinearProjectsTable } from '@/modules/linear/components/linear-projects-table';
import {
  LinearSourceBadge,
  LinearSyncStatusBadge,
} from '@/modules/linear/components/linear-status-badge';
import { useIntegrations } from '@/modules/integration/hooks/use-integrations';
import type { SyncDirection } from '@/modules/linear/api/linear-api';
import { projectApi } from '@/modules/project/api/project-api';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { toast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectLinearSyncStatusProps {
  projectId: string;
  project: {
    source?: string | null;
    externalProvider?: string | null;
    externalProjectId?: string | null;
    syncStatus?: 'synced' | 'pending' | 'error' | 'never_synced' | null;
    lastSyncAt?: string | null;
    syncErrorMessage?: string | null;
    fieldsLockedExternally?: boolean;
  };
  /**
   * Show inline action buttons. Default true.
   */
  showActions?: boolean;
  className?: string;
}

export function ProjectLinearSyncStatus({
  projectId,
  project,
  showActions = true,
  className,
}: ProjectLinearSyncStatusProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: integrationsData } = useIntegrations();
  const linearIntegrations = (integrationsData?.data ?? []).filter(
    (i) => i.provider === 'linear',
  );
  const firstLinear = linearIntegrations[0];
  const syncTasks = useSyncTasks();

  const isLinearLinked = project.externalProvider === 'linear';
  const isProjectFieldLocked = project.fieldsLockedExternally;
  const [unbinding, setUnbinding] = useState(false);
  const confirmAction = useConfirm();
  const queryClient = useQueryClient();

  const handleUnbind = async () => {
    const ok = await confirmAction({
      title: '解绑外部同步',
      description:
        '将清除 Linear 绑定与同步状态，项目回到普通本地项目。此操作不可恢复；之后再次绑定视为全新绑定并重新拉取。',
      confirmText: '解绑',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!ok) return;
    setUnbinding(true);
    try {
      await projectApi.unbindSync(projectId);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('已解绑，项目回到本地项目逻辑');
    } catch (e) {
      toast.error((e as Error).message || '解绑失败');
    } finally {
      setUnbinding(false);
    }
  };

  if (project.source !== 'linear' && !isLinearLinked) {
    return null;
  }

  const handleSyncTasks = (direction: SyncDirection) => {
    syncTasks.mutate({
      projectId,
      direction,
      confirm: direction.startsWith('force-') ? true : undefined,
    });
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm',
          className,
        )}
      >
        <LinearSourceBadge source={project.source} />

        <LinearSyncStatusBadge status={project.syncStatus} />

        {project.lastSyncAt ? (
          <span className="text-xs text-muted-foreground">
            synced{' '}
            {formatDistanceToNow(new Date(project.lastSyncAt), { addSuffix: true })}
          </span>
        ) : null}

        {isProjectFieldLocked ? (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-11 text-muted-foreground">
                <Lock className="size-3" />
                provider-managed fields
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Local editing is fully enabled. Name / description / status
                managed by the provider may be overwritten on the next sync.
                Use “Unbind” to detach and keep this as a plain local project.
              </p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {project.syncErrorMessage ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-11 text-destructive">
                <AlertCircle className="size-3" /> sync error
              </span>
            </TooltipTrigger>
            <TooltipContent>{project.syncErrorMessage}</TooltipContent>
          </Tooltip>
        ) : null}

        {showActions ? (
          <div className="ml-auto flex items-center gap-1.5">
            {firstLinear ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={syncTasks.isPending}
                onClick={() => handleSyncTasks('two-way')}
              >
                <RefreshCw
                  className={cn(
                    'mr-1.5 size-3.5',
                    syncTasks.isPending && 'animate-spin',
                  )}
                />
                Sync tasks
              </Button>
            ) : null}
            {/* 解绑只依赖绑定状态本身，不要求本机仍保留 Linear 集成凭据 */}
            {isLinearLinked || isProjectFieldLocked ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={unbinding}
                onClick={handleUnbind}
              >
                <Unlink
                  className={cn(
                    'mr-1.5 size-3.5',
                    unbinding && 'animate-pulse',
                  )}
                />
                Unbind
              </Button>
            ) : null}
            {firstLinear && !isLinearLinked ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
              >
                Link to Linear…
              </Button>
            ) : null}
            {!firstLinear && !isLinearLinked && !isProjectFieldLocked ? (
              <a
                href="/app/settings/integrations"
                className="text-xs text-brand-linear underline-offset-2 hover:underline"
              >
                Connect Linear
                <ExternalLink className="ml-1 inline-block size-3" />
              </a>
            ) : null}
          </div>
        ) : null}

        {firstLinear ? (
          <LinearProjectsTable
            integrationId={firstLinear.id}
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            targetLocalProjectId={projectId}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
