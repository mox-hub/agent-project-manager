import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { LinearIcon } from '@/components/icons/linear';

export type LinearSyncStatusValue =
  | 'synced'
  | 'pending'
  | 'error'
  | 'never_synced'
  | 'conflict';

/** label 存 i18n key（linearSync.*），渲染时经 t() 翻译 */
const STATUS_MAP: Record<
  LinearSyncStatusValue,
  { label: string; color: string; className: string }
> = {
  synced: {
    label: 'linearSync.synced',
    color: 'text-accent-green',
    className:
      'bg-accent-green/10 text-accent-green ring-1 ring-emerald-500/30 border-accent-green/30',
  },
  pending: {
    label: 'linearSync.pending',
    color: 'text-accent-yellow',
    className:
      'bg-accent-yellow/10 text-accent-yellow ring-1 ring-amber-500/30 border-accent-yellow/30',
  },
  error: {
    label: 'linearSync.error',
    color: 'text-destructive',
    className:
      'bg-destructive/10 text-destructive ring-1 ring-rose-500/30 border-destructive/30/20',
  },
  never_synced: {
    label: 'linearSync.neverSynced',
    color: 'text-muted-foreground',
    className:
      'bg-slate-500/10 text-muted-foreground ring-1 ring-slate-500/30 border-border/20',
  },
  conflict: {
    label: 'linearSync.conflict',
    color: 'text-accent-orange',
    className:
      'bg-accent-orange/10 text-accent-orange ring-1 ring-orange-500/30 border-orange-500/20',
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
          <span className="size-2 rounded-full bg-accent-blue" />
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
  /** 胶囊形态（rounded-full + accent token），用于 toolbar 状态区 */
  pill?: boolean;
}

/** 胶囊形态配色：与 SubPageToolbar 状态徽章的 accent token 体系一致 */
const PILL_CLASS_MAP: Record<LinearSyncStatusValue, string> = {
  synced: 'border-accent-green/30 bg-accent-green-light text-accent-green',
  pending: 'border-accent-yellow/30 bg-accent-yellow-light text-accent-yellow',
  error: 'border-accent-red/30 bg-accent-red-light text-accent-red',
  never_synced: 'border-border bg-muted/60 text-muted-foreground',
  conflict: 'border-accent-orange/30 bg-accent-orange-light text-accent-orange',
};

const PILL_DOT_MAP: Record<LinearSyncStatusValue, string> = {
  synced: 'bg-accent-green',
  pending: 'bg-accent-yellow',
  error: 'bg-accent-red',
  never_synced: 'bg-muted-foreground/60',
  conflict: 'bg-accent-orange',
};

export function LinearSyncStatusBadge({
  status,
  className,
  pill = false,
}: LinearSyncStatusBadgeProps) {
  const { t } = useTranslation();
  const key = (status ?? 'never_synced') as LinearSyncStatusValue;
  const cfg = STATUS_MAP[key] ?? STATUS_MAP.never_synced;
  if (pill) {
    return (
      <span
        className={cn(
          'inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-10 font-medium',
          PILL_CLASS_MAP[key] ?? PILL_CLASS_MAP.never_synced,
          className,
        )}
      >
        <span className={cn('size-1.5 rounded-full', PILL_DOT_MAP[key] ?? PILL_DOT_MAP.never_synced)} />
        {t(cfg.label)}
      </span>
    );
  }
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
          key === 'synced' && 'bg-accent-green',
          key === 'pending' && 'bg-accent-yellow',
          key === 'error' && 'bg-destructive',
          key === 'never_synced' && 'bg-slate-400',
          key === 'conflict' && 'bg-accent-orange',
        )}
      />
      {t(cfg.label)}
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
