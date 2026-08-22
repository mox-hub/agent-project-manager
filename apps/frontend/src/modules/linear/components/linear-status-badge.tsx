import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { LinearIcon } from '@/components/icons/linear';

export type LinearSyncStatusValue =
  | 'synced'
  | 'pending'
  | 'error'
  | 'never_synced'
  | 'conflict';

const STATUS_MAP: Record<
  LinearSyncStatusValue,
  { label: string; color: string; className: string }
> = {
  synced: {
    label: 'Synced',
    color: 'text-emerald-300',
    className:
      'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30 border-emerald-500/20',
  },
  pending: {
    label: 'Pending changes',
    color: 'text-amber-300',
    className:
      'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30 border-amber-500/20',
  },
  error: {
    label: 'Sync error',
    color: 'text-rose-300',
    className:
      'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30 border-rose-500/20',
  },
  never_synced: {
    label: 'Never synced',
    color: 'text-slate-300',
    className:
      'bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/30 border-slate-500/20',
  },
  conflict: {
    label: 'Conflict',
    color: 'text-orange-300',
    className:
      'bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/30 border-orange-500/20',
  },
};

interface LinearSourceBadgeProps {
  source?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function LinearSourceBadge({
  source,
  className,
  showIcon = true,
}: LinearSourceBadgeProps) {
  if (source !== 'linear') {
    if (source === 'jira') {
      return (
        <Badge
          variant="secondary"
          className={cn(
            'inline-flex items-center gap-1.5 border text-xs',
            className,
          )}
        >
          <span className="size-2 rounded-full bg-blue-500" />
          Jira
        </Badge>
      );
    }
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'inline-flex items-center gap-1.5 border border-brand-linear/30 bg-brand-linear/10 text-brand-linear-light text-xs',
        className,
      )}
    >
      {showIcon ? <LinearIcon size={12} /> : null}
      Linear
    </Badge>
  );
}

interface LinearSyncStatusBadgeProps {
  status: LinearSyncStatusValue | null | undefined;
  className?: string;
}

export function LinearSyncStatusBadge({
  status,
  className,
}: LinearSyncStatusBadgeProps) {
  const key = (status ?? 'never_synced') as LinearSyncStatusValue;
  const cfg = STATUS_MAP[key] ?? STATUS_MAP.never_synced;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-11 font-medium border',
        cfg.className,
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          key === 'synced' && 'bg-emerald-400',
          key === 'pending' && 'bg-amber-400',
          key === 'error' && 'bg-rose-400',
          key === 'never_synced' && 'bg-slate-400',
          key === 'conflict' && 'bg-orange-400',
        )}
      />
      {cfg.label}
    </span>
  );
}

interface LinearExternalRefBadgeProps {
  identifier?: string | null;
  url?: string | null;
  className?: string;
}

export function LinearExternalRefBadge({
  identifier,
  url,
  className,
}: LinearExternalRefBadgeProps) {
  if (!identifier) return null;
  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => !url && e.preventDefault()}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-11 font-mono font-medium',
        'bg-brand-linear/15 text-brand-linear-light ring-1 ring-brand-linear/40 hover:bg-brand-linear/25 transition-colors',
        !url && 'pointer-events-none opacity-70',
        className,
      )}
    >
      <LinearIcon size={11} />
      {identifier}
    </a>
  );
}
