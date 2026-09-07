/**
 * @file 运行时心跳监控条
 * @description 周期性执行 probe 并在胶囊条上滚动记录结果（绿=正常/红=故障）：
 *              新样本从右侧推入，仅保留最近 total 条（默认 60），越靠右越新；
 *              hover 单根胶囊查看该次检测的时间与详情。
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatClock, formatDateTime } from '@/shared/lib/date-format';

export interface MonitorProbeResult {
  up: boolean;
  detail?: string;
}

interface MonitorSample {
  at: number;
  up: boolean;
  detail?: string;
}

interface HeartbeatMonitorProps {
  /** 单次探测：返回 up=false 或抛错均记为故障（错误消息进 tooltip） */
  probe: () => Promise<MonitorProbeResult>;
  /** 探测间隔，默认 30s（与守护进程心跳间隔一致） */
  intervalMs?: number;
  /** 保留样本数上限，默认 60 */
  total?: number;
  className?: string;
}

export function HeartbeatMonitor({
  probe,
  intervalMs = 30_000,
  total = 60,
  className,
}: HeartbeatMonitorProps) {
  const { t } = useTranslation();
  const [samples, setSamples] = useState<MonitorSample[]>([]);
  const runningRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      let result: MonitorSample;
      try {
        const probed = await probe();
        result = { at: Date.now(), ...probed };
      } catch (err) {
        result = {
          at: Date.now(),
          up: false,
          detail: err instanceof Error ? err.message : String(err),
        };
      }
      runningRef.current = false;
      if (disposed) return;
      // 只保留最近 total 条：尾部追加、头部截断，视觉上向左滚动
      setSamples((prev) => [...prev, result].slice(-total));
    };
    // 首挂立即探测一次；probe 身份变化只重置计时器，不追加即时样本
    if (!startedRef.current) {
      startedRef.current = true;
      void run();
    }
    const timer = window.setInterval(() => void run(), intervalMs);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [probe, intervalMs, total]);

  const oldest = samples[0];
  // 样本不足 total 时左侧留空位，保证条宽稳定、新样本始终从右侧推入
  const padding = Math.max(0, total - samples.length);

  return (
    <TooltipProvider>
      <div className={cn('space-y-1.5', className)}>
        <div className="flex items-end gap-0.5" role="img">
          {Array.from({ length: padding }, (_, i) => (
            <span
              key={`pad-${i}`}
              className="h-7 w-1 shrink-0 rounded-full bg-muted-foreground/15"
            />
          ))}
          {samples.map((sample) => (
            <Tooltip key={sample.at} delayDuration={120}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'h-7 w-1 shrink-0 cursor-default rounded-full motion-shift hover:scale-y-125',
                    sample.up ? 'bg-accent-green' : 'bg-accent-red',
                  )}
                />
              </TooltipTrigger>
              <TooltipContent className="w-52">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    sample.up ? 'text-accent-green' : 'text-accent-red',
                  )}
                >
                  {sample.up
                    ? t('settings.runtimeMonitorUp')
                    : t('settings.runtimeMonitorDown')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(sample.at)}
                </p>
                {sample.detail && (
                  <p className="mt-1 text-xs break-words">{sample.detail}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex items-center justify-between text-10 text-muted-foreground tabular-nums">
          <span>{oldest ? formatClock(oldest.at) : '—'}</span>
          <span>{t('settings.runtimeJustNow')}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {t('settings.runtimeMonitorFrequency', {
            n: Math.round(intervalMs / 1000),
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
