/**
 * 待决议卡片堆 · 缩小挂条 —— 助理面板左缘的默认伴随形态（2026-10-02 裁决：
 * 取消「展开后左侧栏卡片堆」形态，挂条常驻缩小呈现，点击改开全屏遮罩集中批阅，
 * 见 shared/decision-card/decision-review-modal）。
 * 立体叠边视觉复用 decision-card.css 的 .decision-deck-collapsed-tab。
 */
import { Layers, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AssistantDecisionTabProps {
  /** 待决议总数（角标） */
  count: number;
  /** 是否含紧急阻断项（角标转红 + 脉冲） */
  hasBlocking: boolean;
  /** 点击 → 打开全屏集中批阅遮罩 */
  onOpen: () => void;
}

export function AssistantDecisionTab({ count, hasBlocking, onOpen }: AssistantDecisionTabProps) {
  return (
    <div className="flex flex-col justify-center shrink-0 z-dropdown">
      <button
        type="button"
        onClick={onOpen}
        className="decision-deck-collapsed-tab group flex flex-col items-center justify-between w-11 py-3.5 rounded-xl border border-border/80 bg-background/95 backdrop-blur-xl text-foreground cursor-pointer transition-all active:scale-95"
        title={`打开全屏批阅待决卡片（共 ${count} 项${hasBlocking ? '，含紧急阻断' : ''}）`}
        data-ai-action="assistant.decision.tab.click"
      >
        {/* 顶部：立体层叠卡片图标 */}
        <div className="flex size-7 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple shadow-xs group-hover:scale-110 transition-transform">
          <Layers className="size-4" />
        </div>

        {/* 中间：数量角标与竖排文字 */}
        <div className="my-2.5 flex flex-col items-center gap-2">
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full text-3xs font-semibold tabular-nums shadow-xs',
              hasBlocking
                ? 'bg-accent-red text-primary-foreground animate-pulse'
                : 'bg-accent-purple text-primary-foreground',
            )}
          >
            {count}
          </span>

          {/* 竖排精致文字：「待 决 卡 片」 */}
          <span className="vertical-writing-mode text-2xs font-medium tracking-widest text-muted-foreground group-hover:text-foreground transition-colors select-none py-1">
            待决卡片
          </span>
        </div>

        {/* 底部：全屏批阅入口提示 */}
        <div className="mt-1 flex items-center justify-center text-muted-foreground group-hover:text-accent-purple transition-colors">
          <Maximize2 className="size-3.5" />
        </div>
      </button>
    </div>
  );
}
