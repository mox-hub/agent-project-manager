import * as React from 'react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { History, RefreshCw, X } from 'lucide-react';
import { useSyncLogs } from '../hooks/use-linear-sync';
import { LinearIcon } from '@/components/icons/linear';
import { LinearSyncLog } from './linear-sync-log';
import { useIntegrations } from '@/modules/integration/hooks/use-integrations';

interface LinearSyncLogDrawerProps {
  /** Render a trigger button. If false, the drawer is controlled. */
  trigger?: boolean;
  /** Pre-selected integration (defaults to the first Linear integration) */
  integrationId?: string;
  /** When controlled, override the open state */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function LinearSyncLogDrawer({
  trigger = true,
  integrationId,
  open: controlledOpen,
  onOpenChange,
}: LinearSyncLogDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const { data: integrations } = useIntegrations();
  const linearIntegrations = (integrations?.data ?? []).filter(
    (i) => i.provider === 'linear',
  );
  const [selectedIntegration, setSelectedIntegration] = useState<
    string | undefined
  >(integrationId);

  const resolvedIntegrationId =
    selectedIntegration ?? linearIntegrations[0]?.id ?? '';

  return (
    <>
      {trigger ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          data-ai-component="linear.sync-log.drawer.trigger"
          data-ai-action="linear.sync-log.drawer.trigger.click"
        >
          <History className="mr-1.5 size-3.5" />
          Sync log
        </Button>
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full max-w-md flex-col gap-0 sm:max-w-lg">
          <SheetHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2">
                <LinearIcon size={16} /> Linear sync log
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
            <SheetDescription>
              Recent Linear sync activity. Auto-refreshes every 30 seconds.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 text-xs">
            <span className="text-muted-foreground">Integration:</span>
            <select
              className="rounded border border-border bg-background px-2 py-0.5 text-xs"
              value={resolvedIntegrationId}
              onChange={(e) => setSelectedIntegration(e.target.value)}
            >
              {linearIntegrations.length === 0 ? (
                <option value="">No Linear integration configured</option>
              ) : (
                linearIntegrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIntegration((c) => c)}
              title="Refresh"
            >
              <RefreshCw className="size-3" />
              refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {resolvedIntegrationId ? (
              <LinearSyncLog integrationId={resolvedIntegrationId} limit={100} />
            ) : (
              <div className="text-xs text-muted-foreground">
                Connect a Linear integration first to see sync activity.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}