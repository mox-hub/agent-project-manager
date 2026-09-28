import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, ListChecks, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { TONE_CLASS } from '@/components/ui/tone';
import { DECISION_VERDICT_TONE } from '@/shared/status/status-visuals';
import type { Decision } from '@/shared/decision-card/types';
import {
  useDecompositionReview,
  type DecompositionReviewResult,
} from '../hooks/use-decomposition-review';

/**
 * 拆解质量评估面板（CAP-P-01 五期切片 3）：决策收件箱右栏 plan 卡下方，
 * 人手动触发 AI 评估（颗粒度/可测性/覆盖度）。advisory 信息层——
 * 只呈现问题与建议，不拦截批卡动作；正常任务聚合为一行（渐进展开）。
 */

/** verdict 胶囊配色：tone 唯一链路（描边 + 浅底槽） */
const verdictClass = (verdict: DecompositionReviewResult['verdict']): string => {
  const tone = DECISION_VERDICT_TONE[verdict] ?? 'default';
  return cn(TONE_CLASS[tone].border, TONE_CLASS[tone].light);
};

export function DecompositionReviewPanel({ decision }: { decision: Decision }) {
  const { t } = useTranslation();
  const review = useDecompositionReview();

  // 切换选中卡即清空上一份评估，避免张冠李戴
  const [, resetTick] = useState(0);
  useEffect(() => {
    review.reset();
    resetTick((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.id]);

  if (decision.kind !== 'plan') return null;

  const payload = (decision.payload ?? {}) as {
    added?: Array<Record<string, unknown>>;
  };
  const added = payload.added ?? [];
  const result = review.data;

  const run = () =>
    review.mutate({ tasks: added, detail: decision.detail ?? undefined });

  return (
    <div
      className="mt-4 w-full rounded-xl border border-border bg-card p-3 text-left"
      data-testid="decomposition-review-panel"
      data-ai-component="decision.decomp-review"
    >
      <div className="flex items-center gap-2">
        <ListChecks size={14} className="shrink-0 text-accent-purple" />
        <span className="flex-1 text-xs font-medium text-foreground">
          {t('decision.decompReview.title')}
        </span>
        {result ? (
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-3xs font-medium',
              verdictClass(result.verdict),
            )}
          >
            {t(`decision.decompReview.verdict.${result.verdict}`)}
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          fontSize="xs" 
          onClick={run}
          disabled={review.isPending || added.length === 0}
        >
          {review.isPending ? (
            <Spinner size="sm" />
          ) : (
            <Sparkles size={12} />
          )}
          {result
            ? t('decision.decompReview.reRun')
            : t('decision.decompReview.run')}
        </Button>
      </div>

      {review.isError && (
        <p className="mt-2 text-3xs text-destructive">
          {(review.error as Error | null)?.message ??
            t('decision.decompReview.failed')}
        </p>
      )}

      {result && (
        <div className="mt-2 space-y-1.5">
          {result.summary && (
            <p className="text-2xs leading-relaxed text-content-text-secondary">
              {result.summary}
            </p>
          )}

          {(result.coverage.uncovered.length > 0 || result.coverage.orphans.length > 0) && (
            <div className="rounded-lg border border-accent-yellow/40 bg-accent-yellow-light/40 px-2.5 py-1.5 text-2xs text-content-text-secondary">
              <AlertTriangle size={11} className="mr-1 inline shrink-0 text-accent-yellow" />
              {result.coverage.uncovered.length > 0 && (
                <span>
                  {t('decision.decompReview.uncovered', {
                    points: result.coverage.uncovered.join('、'),
                  })}
                </span>
              )}
              {result.coverage.orphans.length > 0 && (
                <span>
                  {t('decision.decompReview.orphans', {
                    indexes: result.coverage.orphans.map((i) => `#${i + 1}`).join('、'),
                  })}
                </span>
              )}
            </div>
          )}

          {result.tasks
            .filter(
              (f) => f.granularity !== 'ok' || f.testability === 'weak',
            )
            .map((f) => (
            <div
              key={f.index}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5"
            >
              <div className="flex items-center gap-1.5 text-2xs">
                <span className="font-mono text-content-text-muted">#{f.index + 1}</span>
                {f.granularity !== 'ok' && (
                  <span className="rounded-sm bg-accent-yellow-light px-1.5 py-0.5 text-3xs text-accent-yellow">
                    {t(`decision.decompReview.granularity.${f.granularity}`)}
                  </span>
                )}
                {f.testability === 'weak' && (
                  <span className="rounded-sm bg-accent-red-light px-1.5 py-0.5 text-3xs text-accent-red">
                    {t('decision.decompReview.weakTestability')}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-content-text-secondary">
                  {f.reason}
                </span>
              </div>
              {f.suggestion && (
                <p className="mt-0.5 pl-6 text-3xs text-content-text-muted">
                  {t('decision.decompReview.suggestion')}: {f.suggestion}
                </p>
              )}
            </div>
          ))}

          {(() => {
            const okCount = result.tasks.filter(
              (f) => f.granularity === 'ok' && f.testability === 'ok',
            ).length;
            return okCount > 0 ? (
              <div className="flex items-center gap-1.5 px-1 text-3xs text-content-text-muted">
                <CheckCircle2 size={11} className="shrink-0 text-accent-green" />
                {t('decision.decompReview.okSummary', { count: okCount })}
              </div>
            ) : null;
          })()}

          <p className="pt-0.5 text-3xs text-content-text-muted">
            {t('decision.decompReview.disclaimer')}
          </p>
        </div>
      )}
    </div>
  );
}
