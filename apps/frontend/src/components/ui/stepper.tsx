import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  steps: Array<{ id: string; label: string }>;
  current: number;
  className?: string;
}

/** 通用步骤条（受控）：状态派生自 current，步内内容完全由调用方组织 */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn('flex items-center gap-1.5', className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.id} className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-10 font-semibold transition-colors',
                done && 'bg-accent-green text-background',
                active && 'bg-foreground text-background',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check size={10} /> : i + 1}
            </span>
            <span
              className={cn(
                'truncate text-xs',
                active ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="h-px w-4 shrink-0 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
