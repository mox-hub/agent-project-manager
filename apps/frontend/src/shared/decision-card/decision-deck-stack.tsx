/**
 * 决策卡片堆叠与集中批阅组件（Card Deck Stack）
 * 实现实体卡片堆叠（Deck Stacking）、3D 翻面（Card Flip）、印章落下与顺滑滑走（Dismiss Animation）、卡片翻页。
 */
import './decision-card.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Decision, DecisionActionOptions } from './types';
import { DecisionCard } from './decision-card';

export interface DecisionDeckStackProps {
  decisions: Decision[];
  busyId?: string | null;
  onAction: (
    action: string,
    decision: Decision,
    opts?: DecisionActionOptions,
  ) => void;
  onAllDone?: () => void;
  onIndexChange?: (index: number, total: number) => void;
  className?: string;
  /** 伴随式紧凑尺寸（用于助手面板等受限视口伴随式呈现） */
  compact?: boolean;
}

export function DecisionDeckStack({
  decisions,
  busyId,
  onAction,
  onAllDone,
  onIndexChange,
  className,
  compact = false,
}: DecisionDeckStackProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeStamp, setActiveStamp] = useState<'passed' | 'rejected' | null>(null);
  const [dismissDirection, setDismissDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = decisions.length;
  const safeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;
  const currentDecision = decisions[safeIndex] ?? null;

  const onIndexChangeRef = useRef(onIndexChange);
  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  // 通知父级当前进度
  useEffect(() => {
    onIndexChangeRef.current?.(Math.min(safeIndex + 1, total), total);
  }, [safeIndex, total]);

  // 快捷翻面
  const handleToggleFlip = useCallback(() => {
    if (isProcessing) return;
    setIsFlipped((prev) => !prev);
  }, [isProcessing]);

  // 勾选来过（通过并滑出）
  const handlePass = useCallback(() => {
    if (!currentDecision || isProcessing) return;
    setIsProcessing(true);
    setActiveStamp('passed');

    // 150ms 盖章后向右滑出
    setTimeout(() => {
      setDismissDirection('right');
    }, 150);

    // 380ms 提交动作并切换到下一张
    setTimeout(() => {
      onAction('accept', currentDecision);
      setActiveStamp(null);
      setDismissDirection(null);
      setIsFlipped(false);
      setIsProcessing(false);
      setCurrentIndex((prev) => prev + 1);
    }, 380);
  }, [currentDecision, isProcessing, onAction]);

  // 驳回并滑出
  const handleReject = useCallback(
    (opts?: DecisionActionOptions) => {
      if (!currentDecision || isProcessing) return;
      setIsProcessing(true);
      setActiveStamp('rejected');

      // 150ms 盖章后向左滑出
      setTimeout(() => {
        setDismissDirection('left');
      }, 150);

      setTimeout(() => {
        onAction('reject', currentDecision, opts);
        setActiveStamp(null);
        setDismissDirection(null);
        setIsFlipped(false);
        setIsProcessing(false);
        setCurrentIndex((prev) => prev + 1);
      }, 380);
    },
    [currentDecision, isProcessing, onAction],
  );

  // 下一张 / 跳过
  const handleNext = useCallback(() => {
    if (isProcessing || currentIndex >= total - 1) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  }, [isProcessing, currentIndex, total]);

  // 上一张
  const handlePrev = useCallback(() => {
    if (isProcessing || currentIndex <= 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => prev - 1);
  }, [isProcessing, currentIndex]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // 若焦点在 input/textarea 则不拦截
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Enter' || e.key === '1') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePass, handleToggleFlip, handleNext, handlePrev]);

  // 全部批阅完成态
  if (!currentDecision || currentIndex >= total) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="flex size-16 items-center justify-center rounded-2xl bg-accent-green-light text-accent-green shadow-xs">
          <Sparkles className="size-8" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {t('decision.review.allDoneTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('decision.review.allDoneHint')}
        </p>
        {onAllDone && (
          <Button
            onClick={onAllDone}
            className="mt-6 gap-2"
            variant="outline"
            data-ai="deck-back-inbox"
          >
            {t('decision.review.backToInbox')}
          </Button>
        )}
      </div>
    );
  }

  // 准备堆叠显示的卡片（最多同时渲染当前张和后两张底牌）
  const visibleCards = decisions.slice(currentIndex, currentIndex + 3);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col items-center justify-center',
        compact && 'decision-deck-compact',
        className,
      )}
    >
      {/* ── 核心卡片堆叠舞台（Card Deck Stage） ── */}
      <div
        className={cn(
          'decision-deck-stage relative flex w-full items-center justify-center',
          compact ? 'decision-deck-stage-compact pt-1 pb-3' : 'max-w-lg pt-2 pb-6',
        )}
      >
        {visibleCards.map((decision, stackOffset) => {
          const isTop = stackOffset === 0;
          const stackClass =
            stackOffset === 0
              ? 'decision-deck-card-top relative z-30'
              : stackOffset === 1
                ? 'decision-deck-card-under-1'
                : 'decision-deck-card-under-2';

          return (
            <div
              key={decision.id}
              className={cn(
                'w-full transition-all duration-300 flex justify-center',
                stackClass,
              )}
            >
              <DecisionCard
                decision={decision}
                busy={busyId === decision.id || (isTop && isProcessing)}
                onAction={(action, d, opts) => {
                  if (action === 'accept') {
                    handlePass();
                  } else if (action === 'reject') {
                    handleReject(opts);
                  } else {
                    onAction(action, d, opts);
                  }
                }}
                isFlipped={isTop ? isFlipped : false}
                onFlipChange={isTop ? setIsFlipped : undefined}
                stamp={isTop ? activeStamp : null}
                dismissDirection={isTop ? dismissDirection : null}
                variant="vertical"
              />
            </div>
          );
        })}
      </div>

      {/* ── 底部快捷操作条（大尺寸触控 / 快捷批阅） ── */}
      <div
        className={cn(
          'flex w-full items-center justify-between px-2',
          compact ? 'mt-2 decision-deck-actions-compact gap-2' : 'mt-4 max-w-lg gap-3',
        )}
      >
        {/* 上一张 */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={currentIndex <= 0 || isProcessing}
          className={cn(
            'rounded-full border-border/80 shrink-0',
            compact ? 'size-8' : 'size-10',
          )}
          title={t('decision.review.prevCard')}
          aria-label={t('decision.review.prevCard')}
          data-ai="deck-prev"
        >
          <ChevronLeft className={compact ? 'size-4' : 'size-5'} />
        </Button>

        {/* 核心操作组 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 驳回 */}
          <Button
            variant="outline"
            onClick={() => handleReject()}
            disabled={isProcessing}
            className={cn(
              'shrink-0 rounded-full border-accent-red/40 font-medium text-accent-red whitespace-nowrap hover:bg-accent-red-light hover:text-accent-red',
              compact ? 'gap-1 px-3 text-xs' : 'gap-1.5 px-4 text-xs',
            )}
            data-ai="deck-reject"
          >
            <X className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{t('decision.review.quickReject')}</span>
            <span className="font-mono text-10 opacity-60 whitespace-nowrap shrink-0">(2)</span>
          </Button>

          {/* 翻面详情 */}
          <Button
            variant="secondary"
            onClick={handleToggleFlip}
            disabled={isProcessing}
            className={cn(
              'shrink-0 rounded-full font-medium whitespace-nowrap',
              compact ? 'gap-1 px-3 text-xs' : 'gap-1.5 px-4 text-xs',
            )}
            data-ai="deck-flip"
          >
            <RotateCw className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{isFlipped ? t('decision.review.flipFront') : t('decision.review.flipBack')}</span>
            <span className="font-mono text-10 opacity-60 whitespace-nowrap shrink-0">(F)</span>
          </Button>

          {/* 勾选通过（高亮大按钮） */}
          <Button
            variant="default"
            onClick={handlePass}
            disabled={isProcessing}
            className={cn(
              'shrink-0 rounded-full font-semibold shadow-sm whitespace-nowrap',
              compact ? 'gap-1.5 px-4 text-xs' : 'gap-2 px-6 text-sm',
            )}
            data-ai="deck-pass"
          >
            <Check className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{t('decision.review.quickPass')}</span>
            <span className="font-mono text-10 opacity-80 whitespace-nowrap shrink-0">(1/↵)</span>
          </Button>
        </div>

        {/* 下一张 */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex >= total - 1 || isProcessing}
          className={cn(
            'rounded-full border-border/80 shrink-0',
            compact ? 'size-8' : 'size-10',
          )}
          title={t('decision.review.nextCard')}
          aria-label={t('decision.review.nextCard')}
          data-ai="deck-next"
        >
          <ChevronRight className={compact ? 'size-4' : 'size-5'} />
        </Button>
      </div>

      {/* 快捷键提示 */}
      <p className="mt-3 text-center text-11 text-muted-foreground">
        {t('decision.review.shortcuts')}
      </p>
    </div>
  );
}
