import { useState } from 'react';
import { BrainCircuit, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThinkingStep {
  step: number;
  title: string;
  detail?: string;
  durationMs?: number;
}

export interface ThinkingStreamProps {
  steps: ThinkingStep[];
  isThinking?: boolean;
  totalDurationMs?: number;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * ThinkingStream - [AI] 思考折叠核 (DESIGN.md §6.1)
 * 26px 微型紧凑胶囊，烟熏紫呼吸脉冲，点击展开就地查看思维链与推理步骤。
 */
export function ThinkingStream({
  steps,
  isThinking = false,
  totalDurationMs,
  className,
  defaultExpanded = false,
}: ThinkingStreamProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const durationText = totalDurationMs
    ? `${(totalDurationMs / 1000).toFixed(1)}s`
    : undefined;

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-lg border border-border/60 bg-card/60 transition-all',
        isThinking && 'border-accent-purple/40 bg-accent-purple-light/10',
        className,
      )}
      data-ai-component="thinking-stream"
      data-ai-state={isThinking ? 'thinking' : 'done'}
    >
      {/* 26px 紧凑折叠条 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/30"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative flex size-4 shrink-0 items-center justify-center">
            {isThinking ? (
              <span className="size-2 rounded-full bg-accent-purple animate-thinking-pulse" />
            ) : (
              <BrainCircuit className="size-3.5 text-accent-purple shrink-0" />
            )}
          </div>
          <span className="truncate font-medium text-content-text">
            {isThinking ? 'AI 正在深度思考…' : `已深度思考 (${steps.length} 步)`}
          </span>
          {durationText && (
            <span className="shrink-0 font-mono text-11 text-content-text-muted">
              · {durationText}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 text-content-text-muted">
          <span className="text-11">{expanded ? '收起' : '展开思考过程'}</span>
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" />
          )}
        </div>
      </button>

      {/* 展开态：思维链清单 */}
      {expanded && (
        <div className="space-y-1.5 border-t border-border/40 bg-content-bg-secondary/40 px-3 py-2 text-xs">
          {steps.map((item) => (
            <div key={item.step} className="flex items-start gap-2 leading-snug">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-muted/60 font-mono text-10 text-content-text-muted">
                {item.step}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-medium text-content-text-secondary">{item.title}</p>
                {item.detail && (
                  <p className="text-11 text-content-text-muted">{item.detail}</p>
                )}
              </div>
              {item.durationMs && (
                <span className="shrink-0 font-mono text-10 text-content-text-muted">
                  {(item.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
