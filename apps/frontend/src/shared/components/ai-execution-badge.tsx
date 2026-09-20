import { Bot, ShieldAlert, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { ActiveAiExecution } from '@/modules/execution/hooks/use-active-executions-map';

export type { ActiveAiExecution };
export type IssueAiExecutionState = ActiveAiExecution;

export interface AiExecutionBadgeProps {
  execution: ActiveAiExecution;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'pill' | 'compact' | 'line';
  className?: string;
  onClick?: () => void;
}

export function AiExecutionBadge({
  execution,
  size = 'sm',
  variant = 'pill',
  className,
  onClick,
}: AiExecutionBadgeProps) {
  const isPending = execution.status === 'pending_approval';
  const isBlocked = execution.status === 'blocked';

  if (variant === 'compact') {
    return (
      <span
        title={`${execution.agentName}: ${execution.stepSummary || 'AI 正在执行'}`}
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium transition-colors',
          isPending
            ? 'bg-accent-yellow-light/40 text-accent-yellow'
            : isBlocked
              ? 'bg-accent-red-light/40 text-accent-red'
              : 'bg-accent-purple-light/40 text-accent-purple',
          onClick && 'cursor-pointer hover:opacity-80',
          size === 'xs' ? 'text-10' : 'text-xs',
          className,
        )}
      >
        <Bot className={cn('shrink-0', size === 'xs' ? 'size-3' : 'size-3.5', !isPending && !isBlocked && 'animate-pulse')} />
        <span className="relative flex size-1.5 shrink-0">
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              isPending ? 'bg-accent-yellow' : isBlocked ? 'bg-accent-red' : 'bg-accent-purple',
            )}
          />
          <span
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              isPending ? 'bg-accent-yellow' : isBlocked ? 'bg-accent-red' : 'bg-accent-purple',
            )}
          />
        </span>
      </span>
    );
  }

  if (variant === 'line') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 rounded border px-2 py-1 text-xs transition-colors',
          isPending
            ? 'border-accent-yellow/30 bg-accent-yellow-light/20 text-accent-yellow'
            : isBlocked
              ? 'border-accent-red/30 bg-accent-red-light/20 text-accent-red'
              : 'border-accent-purple/30 bg-accent-purple-light/20 text-accent-purple',
          onClick && 'cursor-pointer hover:opacity-90',
          className,
        )}
      >
        {isPending ? (
          <ShieldAlert className="size-3.5 shrink-0 animate-bounce" />
        ) : isBlocked ? (
          <AlertCircle className="size-3.5 shrink-0" />
        ) : (
          <Spinner className="size-3.5 shrink-0 text-accent-purple" />
        )}
        <span className="font-mono font-medium">{execution.agentName}</span>
        <span className="truncate opacity-80">{execution.stepSummary || '正在执行'}</span>
      </div>
    );
  }

  // default 'pill'
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        isPending
          ? 'border-accent-yellow/30 bg-accent-yellow-light/30 text-accent-yellow'
          : isBlocked
            ? 'border-accent-red/30 bg-accent-red-light/30 text-accent-red'
            : 'border-accent-purple/30 bg-accent-purple-light/30 text-accent-purple',
        onClick && 'cursor-pointer hover:bg-accent-purple-light/50',
        className,
      )}
    >
      <Bot className={cn('size-3 shrink-0', !isPending && !isBlocked && 'animate-pulse')} />
      <span className="max-w-28 truncate">{execution.agentName}</span>
      <span className="relative flex size-1.5 shrink-0">
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            isPending ? 'bg-accent-yellow' : isBlocked ? 'bg-accent-red' : 'bg-accent-purple',
          )}
        />
        <span
          className={cn(
            'relative inline-flex size-1.5 rounded-full',
            isPending ? 'bg-accent-yellow' : isBlocked ? 'bg-accent-red' : 'bg-accent-purple',
          )}
        />
      </span>
    </div>
  );
}
