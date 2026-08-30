import { CheckCircle2, Circle, CircleAlert, CircleDashed, Loader2, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import type { BootRuntimeState } from '../types';

export interface BootChecklistProps {
  steps: BootRuntimeState[];
  className?: string;
}

function StatusIcon({ status }: { status: BootRuntimeState['status'] }) {
  if (status === 'running') return <Spinner size="sm" className="text-primary" />;
  if (status === 'success')
    return <CheckCircle2 className="h-4 w-4 text-accent-green" aria-label="已完成" />;
  if (status === 'error')
    return <CircleAlert className="h-4 w-4 text-destructive" aria-label="失败" />;
  if (status === 'skipped')
    return <SkipForward className="h-4 w-4 text-muted-foreground" aria-label="已跳过" />;
  return <Circle className="h-4 w-4 text-muted-foreground/60" aria-label="等待" />;
}

export function BootChecklist({ steps, className }: BootChecklistProps) {
  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {steps.map((step) => {
        const isRunning = step.status === 'running';
        const isError = step.status === 'error';
        return (
          <li
            key={step.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors',
              isRunning && 'border-primary/40 bg-primary/5',
              isError && 'border-destructive/50 bg-destructive/5',
            )}
          >
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center">
              <StatusIcon status={step.status} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{step.title}</span>
                {step.status === 'pending' && (
                  <CircleDashed className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                {step.status === 'running' && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {step.detail ?? step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default BootChecklist;