import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export interface BootProgressBarProps {
  progress: number;
  currentLabel?: string;
  isRunning: boolean;
  allDone: boolean;
  errors: number;
  className?: string;
}

export function BootProgressBar({
  progress,
  currentLabel,
  isRunning,
  allDone,
  errors,
  className,
}: BootProgressBarProps) {
  const stateLabel = allDone
    ? errors > 0
      ? `已完成 ${progress}% · 存在 ${errors} 个错误`
      : `已完成 ${progress}%`
    : isRunning
      ? `正在启动 ${progress}%`
      : '等待启动';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="truncate">{currentLabel ?? stateLabel}</span>
        <span className="font-mono text-foreground tabular-nums">{progress}%</span>
      </div>
      <Progress
        value={progress}
        className={cn(
          'h-1.5 transition-all',
          errors > 0 && allDone ? '[&>div]:bg-destructive' : undefined,
        )}
      />
    </div>
  );
}

export default BootProgressBar;