import * as React from 'react';
import { useState } from 'react';
import { RefreshCw, Lock, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSyncProject, useSyncTasks } from '@/modules/linear/hooks/use-linear-sync';
import { LinearProjectsTable } from '@/modules/linear/components/linear-projects-table';
import {
  LinearSourceBadge,
  LinearSyncStatusBadge,
} from '@/modules/linear/components/linear-status-badge';
import { useIntegrations } from '@/modules/integration/hooks/use-integrations';
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

const SYNC_DIRECTIONS = [
  { value: 'pull', label: 'Pull from Linear' },
  { value: 'push', label: 'Push to Linear' },
  { value: 'two-way', label: 'Two-way sync' },
  { value: 'force-pull', label: 'Force Pull (overwrite local)' },
  { value: 'force-push', label: 'Force Push (overwrite Linear)' },
] as const;

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

  if (project.source !== 'linear' && !isLinearLinked) {
    return null;
  }

  const handleSyncTasks = (direction: typeof SYNC_DIRECTIONS[number]['value']) => {
    syncTasks.mutate({
      projectId,
      direction: direction as any,
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
              <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Lock className="size-3" />
                base fields locked
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Name, description, icon, color, status, priority, health are
                synced from Linear and cannot be edited locally. Local-only
                fields (members, progress, AI context, custom metadata) remain
                editable.
              </p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {project.syncErrorMessage ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                <AlertCircle className="size-3" /> sync error
              </span>
            </TooltipTrigger>
            <TooltipContent>{project.syncErrorMessage}</TooltipContent>
          </Tooltip>
        ) : null}

        {showActions && firstLinear ? (
          <div className="ml-auto flex items-center gap-1.5">
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
            {!isLinearLinked ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
              >
                Link to Linear…
              </Button>
            ) : null}
          </div>
        ) : null}

        {showActions && !firstLinear ? (
          <a
            href="/app/settings/integrations"
            className="ml-auto text-xs text-[#5E6AD2] underline-offset-2 hover:underline"
          >
            Connect Linear
            <ExternalLink className="ml-1 inline-block size-3" />
          </a>
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
