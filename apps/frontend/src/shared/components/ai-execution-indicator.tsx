import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import type { AIExecutionStatus } from '@/modules/task/api/task-api';
import { cn } from '@/lib/utils';

export interface AiExecutionIndicatorProps {
  status: AIExecutionStatus;
  compact?: boolean;
}

const STATUS_CONFIG: Record<AIExecutionStatus, { icon: typeof Clock; label: string; className: string }> = {
  draft: {
    icon: Clock,
    label: 'Draft',
    className: 'text-muted-foreground bg-muted/50',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    className: 'text-muted-foreground bg-muted/50',
  },
  running: {
    icon: Loader2,
    label: 'Running',
    className: 'text-accent-blue bg-accent-blue-light/50',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    className: 'text-accent-green bg-accent-green-light/50',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    className: 'text-accent-red bg-accent-red-light/50',
  },
  blocked: {
    icon: Clock,
    label: 'Blocked',
    className: 'text-accent-amber bg-accent-amber-light/50',
  },
  superseded: {
    icon: Clock,
    label: 'Superseded',
    className: 'text-muted-foreground bg-muted/30',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    className: 'text-muted-foreground bg-muted/50',
  },
};

export function AiExecutionIndicator({ status, compact }: AiExecutionIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs',
        config.className,
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />
      {!compact && config.label}
    </span>
  );
}
