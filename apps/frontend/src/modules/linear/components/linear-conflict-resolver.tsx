import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, Upload, Copy } from 'lucide-react';
import { useResolveConflict } from '../hooks/use-linear-sync';
import { LinearIcon } from '@/components/icons/linear';

type ConflictResolution = 'use_linear' | 'use_local' | 'keep_both';

interface LinearConflictResolverProps {
  issueId: string;
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
  issueId,
  localVersion,
  remoteVersion,
  onResolved,
  compact = false,
  triggerLabel = 'Resolve',
}: LinearConflictResolverProps) {
  // pending 仅作为提交中的写入闸，值无读取方
  const [, setPending] = useState<ConflictResolution | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const resolve = useResolveConflict();

  const submit = async (resolution: ConflictResolution) => {
    if (!resolution) return;
    setPending(resolution);
    setOpenMenu(false);
    try {
      await resolve.mutateAsync({ issueId, resolution });
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
          fontSize="2xs" 
          disabled={resolve.isPending}
          onClick={() => setOpenMenu((v) => !v)}
          data-ai-component="linear.conflict-resolver.compact"
        >
          <AlertTriangle className="mr-1 size-3" />
          {triggerLabel}
        </Button>
        {openMenu ? (
          <div
            className="absolute right-0 top-full z-modal mt-1 w-56 rounded-md border border-border bg-background p-1 shadow-xs"
            onMouseLeave={() => setOpenMenu(false)}
          >
            <Button variant="ghost"
              type="button"
              className="flex items-start"
              onClick={() => submit('use_linear')}
              disabled={resolve.isPending}
            >
              <Download className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <div className="font-medium">Use Linear</div>
                <div className="text-3xs text-muted-foreground">Override local</div>
              </div>
            </Button>
            <Button variant="ghost"
              type="button"
              className="flex items-start"
              onClick={() => submit('use_local')}
              disabled={resolve.isPending}
            >
              <Upload className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <div className="font-medium">Use Local</div>
                <div className="text-3xs text-muted-foreground">Push to Linear</div>
              </div>
            </Button>
            <Button variant="ghost"
              type="button"
              className="flex items-start"
              onClick={() => submit('keep_both')}
              disabled={resolve.isPending}
            >
              <Copy className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <div className="font-medium">Keep Both</div>
                <div className="text-3xs text-muted-foreground">Duplicate remote</div>
              </div>
            </Button>
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
          className="justify-start"
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
          className="justify-start"
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
          className="justify-start"
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
      <div className="mt-3 flex items-center gap-2 text-2xs text-muted-foreground">
        <LinearIcon size={12} />
        <span>
          local: <code className="font-mono">{localVersion ?? '—'}</code> • remote:{' '}
          <code className="font-mono">{remoteVersion ?? '—'}</code>
        </span>
      </div>
    </div>
  );
}
