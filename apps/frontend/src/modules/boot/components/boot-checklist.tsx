import { Check, CircleAlert, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from '@/components/ui/stepper';
import type { BootRuntimeState } from '../types';

export interface BootChecklistProps {
  steps: BootRuntimeState[];
  className?: string;
}

/**
 * 启动自检清单（纵向步骤条，纯展示不导航）：
 * success/skipped→completed（skipped 用 muted 底+跳过图标）、running→loading 旋转、
 * error→红色活动步、pending→序号；连接线随步状态点亮。
 */
export function BootChecklist({ steps, className }: BootChecklistProps) {
  const passed = (s: BootRuntimeState) => s.status === 'success' || s.status === 'skipped';
  const currentIdx = steps.findIndex((s) => !passed(s));
  const activeStep = currentIdx === -1 ? steps.length : currentIdx + 1;

  return (
    <Stepper orientation="vertical" value={activeStep} className={className}>
      <StepperNav>
        {steps.map((step, i) => {
          const isError = step.status === 'error';
          const isSkipped = step.status === 'skipped';
          const isLast = i === steps.length - 1;
          return (
            <StepperItem
              key={step.id}
              step={i + 1}
              completed={passed(step)}
              loading={step.status === 'running'}
              className="w-full"
            >
              <div className="flex w-full items-start gap-3">
                <div className="flex flex-col items-center self-stretch">
                  <StepperIndicator
                    className={cn(
                      isError &&
                        'data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground',
                      isSkipped &&
                        'border-border data-[state=completed]:bg-muted data-[state=completed]:text-muted-foreground',
                    )}
                  >
                    {step.status === 'success' ? (
                      <Check className="size-3.5" />
                    ) : step.status === 'skipped' ? (
                      <SkipForward className="size-3.5" />
                    ) : step.status === 'running' ? (
                      <Spinner size="sm" className="size-3.5 text-primary-foreground" />
                    ) : isError ? (
                      <CircleAlert className="size-3.5" />
                    ) : (
                      i + 1
                    )}
                  </StepperIndicator>
                  {!isLast && (
                    <StepperSeparator
                      className={cn('m-0 w-0.5 flex-1 rounded-full', isSkipped && 'data-[state=completed]:bg-border')}
                    />
                  )}
                </div>
                <div className={cn('min-w-0 flex-1', !isLast && 'pb-6')}>
                  <StepperTitle
                    className={cn(isError && 'data-[state=active]:text-destructive')}
                  >
                    {step.title}
                  </StepperTitle>
                  <StepperDescription className="mt-1 text-xs leading-snug">
                    {step.detail ?? step.description}
                  </StepperDescription>
                </div>
              </div>
            </StepperItem>
          );
        })}
      </StepperNav>
    </Stepper>
  );
}

export default BootChecklist;
