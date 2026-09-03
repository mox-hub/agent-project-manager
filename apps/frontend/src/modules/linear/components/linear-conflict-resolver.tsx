import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, Upload, Copy } from 'lucide-react';
import { useResolveConflict } from '../hooks/use-linear-sync';
import { LinearIcon } from '@/components/icons/linear';

interface LinearConflictResolverProps {
  taskId: string;
  localVersion?: string | null;
  remoteVersion?: string | null;
  onResolved?: () => void;
  /**
   * compact = just a single "Resolve" trigger button that opens a dropdown.
   * Used in compact task panels.
   * Default false (full card UI).
   */
  compact?: boolean;
  /** When compact, optionally override the trigger label. */
  triggerLabel?: string;
}

export function LinearConflictResolver({
  taskId,
  localVersion,
  remoteVersion,
  onResolved,
  compact = false,
  triggerLabel = 'Resolve',
}: LinearConflictResolverProps) {
  const [pending, setPending] = useState<null | 'use_linear' | 'use_local' | 'keep_both'>(
    null,
  );
  const [openMenu, setOpenMenu] = useState(false);
  const resolve = useResolveConflict();

  const submit = async (resolution: typeof pending) => {
    if (!resolution) return;
    setPending(resolution);
    setOpenMenu(false);
    try {
      await resolve.mutateAsync({ taskId, resolution });
      onResolved?.();
    } finally {
      setPending(null);
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-11 border-orange-500/40 text-accent-orange hover:bg-accent-orange/10"
          disabled={resolve.isPending}
          onClick={() => setOpenMenu((v) => !v)}
          data-ai-component="linear.conflict-resolver.compact"
        >
          <AlertTriangle className="mr-1 size-3" />
          {triggerLabel}
        </Button>
        {openMenu ? (
          <div
            className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-background p-1 shadow-lg"
            onMouseLeave={() => setOpenMenu(false)}
          >
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
              onClick={() => submit('use_linear')}
              disabled={resolve.isPending}
            >
              <Download className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <div className="font-medium">Use Linear</div>
                <div className="text-10 text-muted-foreground">Override local</div>
              </div>
            </button>
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
              onClick={() => submit('use_local')}
              disabled={resolve.isPending}
            >
              <Upload className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <div className="font-medium">Use Local</div>
                <div className="text-10 text-muted-foreground">Push to Linear</div>
              </div>
            </button>
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
              onClick={() => submit('keep_both')}
              disabled={resolve.isPending}
            >
              <Copy className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <div className="font-medium">Keep Both</div>
                <div className="text-10 text-muted-foreground">Duplicate remote</div>
              </div>
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-orange-500/30 bg-accent-orange/5 p-4">
      <div className="flex items-center gap-2 text-accent-orange">
        <AlertTriangle className="size-4" />
        <h4 className="font-medium">Sync conflict detected</h4>
      </div>
      <p className="mt-1 text-sm text-accent-orange/80">
        Both Linear and APM have changes for this task. Pick how to resolve.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          onClick={() => submit('use_linear')}
          disabled={resolve.isPending}
          variant="secondary"
          className="justify-start gap-2"
        >
          <Download className="size-4" />
          <div className="text-left">
            <div className="font-medium">Use Linear</div>
            <div className="text-xs text-muted-foreground">
              Override local with Linear version
            </div>
          </div>
        </Button>
        <Button
          onClick={() => submit('use_local')}
          disabled={resolve.isPending}
          variant="secondary"
          className="justify-start gap-2"
        >
          <Upload className="size-4" />
          <div className="text-left">
            <div className="font-medium">Use Local</div>
            <div className="text-xs text-muted-foreground">
              Push local to Linear
            </div>
          </div>
        </Button>
        <Button
          onClick={() => submit('keep_both')}
          disabled={resolve.isPending}
          variant="secondary"
          className="justify-start gap-2"
        >
          <Copy className="size-4" />
          <div className="text-left">
            <div className="font-medium">Keep Both</div>
            <div className="text-xs text-muted-foreground">
              Create a duplicate of the Linear version
            </div>
          </div>
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-11 text-muted-foreground">
        <LinearIcon size={12} />
        <span>
          local: <code className="font-mono">{localVersion ?? '—'}</code> • remote:{' '}
          <code className="font-mono">{remoteVersion ?? '—'}</code>
        </span>
      </div>
    </div>
  );
}
