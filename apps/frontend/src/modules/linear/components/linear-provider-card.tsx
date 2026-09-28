import * as React from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { LinearIcon } from '@/components/icons/linear';
import { cn } from '@/lib/utils';

interface LinearProviderCardProps {
  installed: boolean;
  connected: boolean;
  configured: boolean;
  syncingProjects: number;
  configuredInstances: number;
  onConnect: () => void;
  onManage: () => void;
}

export function LinearProviderCard({
  installed,
  connected,
  configured,
  syncingProjects,
  configuredInstances,
  onConnect,
  onManage,
}: LinearProviderCardProps) {
  const statusLabel = !installed
    ? 'Available'
    : connected
      ? 'Connected'
      : configured
        ? 'Configured'
        : 'Disconnected';

  const statusColor = !installed
    ? 'bg-brand-linear/20 text-brand-linear-light'
    : connected
      ? 'bg-accent-green/20 text-accent-green'
      : 'bg-slate-500/30 text-muted-foreground';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10',
        'bg-gradient-to-br from-brand-linear-darkest via-brand-linear-deep to-brand-linear',
        'p-6 text-white shadow-xs transition-all duration-normal',
        // hover:shadow-brand-linear/20 是幽灵类（--shadow-brand-linear 从未注册，不生成 CSS），
        // hover:shadow-xs 与静置同值属冗余；悬停反馈由 hover:border-white/20 承载（宪法 §3.6）
        'hover:border-white/20',
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--color-brand-linear)' }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur">
            <LinearIcon size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight">Linear</h3>
              <Badge
                variant="secondary"
                className={cn(
                  'border-0 text-3xs font-medium uppercase tracking-wider',
                  statusColor,
                )}
              >
                {statusLabel}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-white/70">
              Issue tracking &amp; sprint planning
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Project sync (one-way)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Task sync (two-way)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Hybrid conflict policy
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <div className="text-2xl font-semibold">{syncingProjects}</div>
          <div className="text-xs text-white/60">Linked projects</div>
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between">
        <div className="text-xs text-white/60">
          {configuredInstances} configured instance
          {configuredInstances === 1 ? '' : 's'}
        </div>
        {installed ? (
          <Button
            onClick={onManage}
            variant="secondary"
            
          >
            Manage
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button
            onClick={onConnect}
            
          >
            Connect Linear
            <ArrowRight className="ml-2 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function LinearStatusIndicator({
  state,
  className,
}: {
  state: 'idle' | 'loading' | 'success' | 'error';
  className?: string;
}) {
  if (state === 'loading') {
    return (
      <Spinner
        className={cn('size-4 text-brand-linear', className)}
      />
    );
  }
  if (state === 'success') {
    return <CheckCircle2 className={cn('size-4 text-accent-green', className)} />;
  }
  if (state === 'error') {
    return <XCircle className={cn('size-4 text-destructive', className)} />;
  }
  return null;
}
