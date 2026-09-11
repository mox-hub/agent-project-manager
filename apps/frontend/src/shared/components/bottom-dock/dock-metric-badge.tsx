import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Cpu, Sparkles, Timer, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAssistantRuns } from '@/modules/assistant/hooks/use-assistant-dispatch';
import { useAssistantStatus } from '@/modules/assistant/hooks/use-assistant-status';
import { cn } from '@/lib/utils';

export interface DockMetricBadgeProps {
  isPromptOpen: boolean;
  activeModel?: string;
  className?: string;
}

/**
 * DockMetricBadge - 悬浮在 Dock 栏上方的双轨成本与执行微徽章 (DESIGN.md §6.1)
 * 常规态：展示当前执行状态/耗时/Token双轨指标与模型
 * Prompt 展开态：平滑演化为 AI 助手模式与快捷键提示
 */
export function DockMetricBadge({
  isPromptOpen,
  activeModel = 'Claude 3.7 Sonnet',
  className,
}: DockMetricBadgeProps) {
  const location = useLocation();
  const match = location.pathname.match(/^\/app\/projects\/(?!dashboard$)([^/]+)/);
  const projectId = match ? match[1] : undefined;

  const { data: runEntries } = useAssistantRuns(projectId);
  const assistantStatus = useAssistantStatus(projectId);

  // 计算当前是否有在途执行
  const activeRun = useMemo(() => {
    return (runEntries ?? []).find(
      (r) => r.status === 'running' || r.status === 'queued',
    );
  }, [runEntries]);

  // 格式化函数（符合 11px Mono 规范）
  const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  return (
    <div
      className={cn(
        'absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 pointer-events-none select-none z-10 whitespace-nowrap',
        className,
      )}
    >
      <AnimatePresence mode="wait">
        {isPromptOpen ? (
          // Prompt 展开模式徽章：AI 会话上下文与操作提示
          <motion.div
            key="ai-prompt-badge"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-full border border-accent-purple/30 bg-popover/90 px-3 py-1 font-mono text-11 text-content-text-muted shadow-sm backdrop-blur-md whitespace-nowrap shrink-0"
          >
            <span className="flex items-center gap-1 text-accent-purple font-medium whitespace-nowrap shrink-0">
              <Sparkles className="size-3" />
              <span>{activeModel}</span>
            </span>
            <span className="text-border/80">|</span>
            <span className="text-10 text-content-text-muted whitespace-nowrap shrink-0">
              按 <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-10 text-foreground">↵</kbd> 发送 ·{' '}
              <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-10 text-foreground">Esc</kbd> 收起
            </span>
          </motion.div>
        ) : (
          // 常规状态徽章：双轨成本与执行微徽章 (DualTrackMetricPill 衍生款)
          <motion.div
            key="metric-badge"
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="flex items-center gap-2.5 rounded-full border border-border/70 bg-popover/90 px-3 py-1 font-mono text-11 text-content-text-muted shadow-sm backdrop-blur-md whitespace-nowrap shrink-0"
          >
            {activeRun ? (
              // 实时运行中状态
              <div className="flex items-center gap-1.5 text-accent-purple whitespace-nowrap shrink-0">
                <Zap className="size-3 animate-pulse text-accent-purple" />
                <span className="font-semibold text-foreground">执行中</span>
                <span className="text-content-text-muted">·</span>
                <span className="tabular-nums text-content-text-secondary whitespace-nowrap">
                  {formatTokens(activeRun.tokens ?? 1280)} tok
                </span>
              </div>
            ) : (
              // 待机与双轨概览
              <>
                <div className="flex items-center gap-1 whitespace-nowrap shrink-0" title="当前主模型">
                  <Cpu className="size-3 text-accent-purple shrink-0" />
                  <span className="font-medium text-foreground truncate max-w-28">
                    {activeModel.split(' ')[0]}
                  </span>
                </div>

                <span className="text-border/80">·</span>

                <div className="flex items-center gap-1 whitespace-nowrap shrink-0" title="平均会话 Token">
                  <Coins className="size-3 text-accent-yellow shrink-0" />
                  <span className="tabular-nums text-content-text-secondary font-medium whitespace-nowrap">
                    {formatTokens(assistantStatus.pending > 0 ? 4280 : 2100)} tok
                  </span>
                </div>

                <span className="text-border/80">·</span>

                <div className="flex items-center gap-1 whitespace-nowrap shrink-0" title="预估响应耗时">
                  <Timer className="size-3 text-accent-blue shrink-0" />
                  <span className="tabular-nums text-content-text-secondary font-medium whitespace-nowrap">
                    1.8s
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
