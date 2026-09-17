/**
 * 决策集中批阅全屏悬浮弹窗（Decision Review Modal）
 * 触发后以毛玻璃全屏悬浮弹出卡片堆，支持用户一张一张快速勾选/批阅通过，带堆叠、翻页、翻面与滑出动画。
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Decision, DecisionActionOptions } from '@/shared/decision-card/types';
import { DecisionDeckStack } from '@/shared/decision-card/decision-deck-stack';

export interface DecisionReviewModalProps {
  open: boolean;
  onClose: () => void;
  decisions: Decision[];
  busyId?: string | null;
  onAction: (
    action: string,
    decision: Decision,
    opts?: DecisionActionOptions,
  ) => void;
}

export function DecisionReviewModal({
  open,
  onClose,
  decisions,
  busyId,
  onAction,
}: DecisionReviewModalProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState({ current: 1, total: decisions.length });

  const handleIndexChange = useCallback((current: number, totalCount: number) => {
    setProgress((prev) => {
      if (prev.current === current && prev.total === totalCount) return prev;
      return { current, total: totalCount };
    });
  }, []);

  // Escape 键退出
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const total = decisions.length;
  const percent = total > 0 ? Math.min(100, Math.round((progress.current / total) * 100)) : 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('decision.review.modalTitle')}
      className="fixed inset-0 z-50 flex flex-col bg-background/85 backdrop-blur-md transition-all duration-200"
    >
      {/* ── 顶部导航条 ── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {t('decision.review.modalTitle')}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {t('decision.review.progress', {
                  current: progress.current,
                  total: progress.total,
                })}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右侧关闭按钮 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-9 rounded-full"
            aria-label={t('common.close')}
            title="Esc"
          >
            <X className="size-5" />
          </Button>
        </div>
      </header>

      {/* ── 中间主舞台（卡片堆居中呈现） ── */}
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6">
        <DecisionDeckStack
          decisions={decisions}
          busyId={busyId}
          onAction={onAction}
          onAllDone={onClose}
          onIndexChange={handleIndexChange}
        />
      </main>
    </div>
  );
}
