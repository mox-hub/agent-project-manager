import { Coins, Cpu, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DualTrackMetricPillProps {
  tokens?: number;
  durationMs?: number;
  costUsd?: number;
  model?: string;
  className?: string;
}

/**
 * DualTrackMetricPill - [AI] 双轨成本与执行微徽章 (DESIGN.md §6.1)
 * 11px Mono 字阶，低调沉稳色阶，用于 AI 执行卡片或会话消息的角落呈现。
 */
export function DualTrackMetricPill({
  tokens,
  durationMs,
  costUsd,
  model,
  className,
}: DualTrackMetricPillProps) {
  const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
  const formatDuration = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const formatCost = (usd: number) => `$${usd.toFixed(usd < 0.01 ? 4 : 3)}`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 font-mono text-11 text-content-text-muted select-none',
        className,
      )}
      data-ai-component="dual-track-metric-pill"
    >
      {tokens !== undefined && (
        <span className="inline-flex items-center gap-1" title="Token 消耗">
          <Coins className="size-3 shrink-0 text-accent-yellow" />
          <span className="font-medium text-content-text-secondary tabular-nums">
            {formatTokens(tokens)}
          </span>
        </span>
      )}
      {durationMs !== undefined && (
        <span className="inline-flex items-center gap-1" title="执行耗时">
          <Timer className="size-3 shrink-0 text-accent-blue" />
          <span className="font-medium text-content-text-secondary tabular-nums">
            {formatDuration(durationMs)}
          </span>
        </span>
      )}
      {costUsd !== undefined && (
        <span className="inline-flex items-center gap-1" title="预估费用">
          <span className="text-accent-green">$</span>
          <span className="font-medium text-content-text-secondary tabular-nums">
            {formatCost(costUsd).slice(1)}
          </span>
        </span>
      )}
      {model && (
        <span className="inline-flex items-center gap-1" title={`模型: ${model}`}>
          <Cpu className="size-3 shrink-0 text-accent-purple" />
          <span className="truncate max-w-28">{model}</span>
        </span>
      )}
    </div>
  );
}
