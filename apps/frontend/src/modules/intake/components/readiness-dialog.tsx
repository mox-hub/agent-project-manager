import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  READINESS_DIMENSION_LABELS,
  readinessCacheKey,
  useReadinessReview,
  type ReadinessReviewResult,
} from '../hooks/use-readiness-review';

/**
 * 完备性评估对话框（CAP-P-01 五期切片 2）：AI 读管道工件输出六维度评估 +
 * 缺口账 + verdict。评估由人手动触发（省 token），结果入 React Query 缓存
 * 供管道卡徽章共享；blocked 时 CTA 是「去补」而非禁止——评估仅呈现，不拦路。
 */

const VERDICT_STYLE: Record<ReadinessReviewResult['verdict'], string> = {
  ready: 'border-accent-green/40 bg-accent-green-light/50 text-accent-green',
  'needs-clarification': 'border-accent-yellow/40 bg-accent-yellow-light/50 text-accent-yellow',
  blocked: 'border-accent-red/40 bg-accent-red-light/50 text-accent-red',
};

const DIMENSION_DOT: Record<ReadinessReviewResult['dimensions'][number]['status'], string> = {
  ready: 'bg-accent-green',
  unclear: 'bg-accent-yellow',
  missing: 'bg-accent-red',
};

export function ReadinessDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  requirementDocId,
  analysisDocId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  requirementDocId: string;
  analysisDocId?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const review = useReadinessReview(projectId);
  // 缓存读取（enabled:false 只读不拉）：管道卡徽章与对话框共享同一条结果
  const cached = useQuery<ReadinessReviewResult>({
    queryKey: readinessCacheKey(projectId, requirementDocId),
    enabled: false,
    staleTime: Infinity,
  });
  const result = cached.data ?? null;

  useEffect(() => {
    if (open) review.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent keepDefaultWidth={false} className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={16} />
            {t('intake.readiness.title', '完备性评估')}
            <span className="text-xs font-normal text-content-text-muted">{projectName}</span>
          </DialogTitle>
          <DialogDescription>
            {t(
              'intake.readiness.desc',
              'AI 同事对照六维度评估这条需求的信息是否够开工，并给出缺口账；评估仅供你判断，不拦截任何操作。',
            )}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3 py-4">
            <p className="text-xs text-content-text-secondary">
              {t('intake.readiness.sourceHint', '评估依据：需求纪要与分析报告（如有）。')}
            </p>
            {review.isError && (
              <p className="text-xs text-destructive">
                {(review.error as Error | null)?.message ??
                  t('intake.readiness.failed', '评估失败，请重试')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2 text-sm" data-testid="readiness-result">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  VERDICT_STYLE[result.verdict],
                )}
              >
                {t(`intake.readiness.verdict.${result.verdict}`)}
              </span>
            </div>
            {result.summary && (
              <p className="leading-relaxed text-content-text-secondary">{result.summary}</p>
            )}

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {result.dimensions.map((d) => (
                <div
                  key={d.key}
                  className="flex items-start gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
                  title={d.evidence || d.gap || undefined}
                >
                  <span
                    className={cn('mt-1 size-2 shrink-0 rounded-full', DIMENSION_DOT[d.status])}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground">
                      {READINESS_DIMENSION_LABELS[d.key] ?? d.key}
                    </div>
                    {(d.gap || d.evidence) && (
                      <div className="mt-0.5 line-clamp-2 text-10 text-content-text-muted">
                        {d.gap || d.evidence}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {result.missingInfo.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-content-text-secondary">
                  {t('intake.readiness.gapsTitle', '缺口账')}
                  <span className="ml-1 font-normal text-content-text-muted">
                    （{result.missingInfo.length}）
                  </span>
                </span>
                {result.missingInfo.map((g) => (
                  <div
                    key={g.item}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          g.blocking ? 'bg-accent-red' : 'bg-accent-yellow',
                        )}
                      />
                      <span className="text-xs font-medium text-foreground">{g.item}</span>
                      {g.blocking && (
                        <span className="rounded bg-accent-red-light px-1.5 py-0.5 text-10 text-accent-red">
                          {t('intake.readiness.blocking', '阻塞')}
                        </span>
                      )}
                    </div>
                    {g.why && (
                      <div className="mt-1 text-10 text-content-text-muted">
                        {t('intake.readiness.why', '为什么')}: {g.why}
                      </div>
                    )}
                    {g.howToFill && (
                      <div className="mt-0.5 text-10 text-content-text-muted">
                        {t('intake.readiness.howToFill', '怎么补')}: {g.howToFill}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-10 text-content-text-muted">
              {t('intake.readiness.disclaimer', 'AI 评估仅供人审，不作为开工依据')}
            </span>
            <div className="flex items-center gap-2">
              {result && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate(`/app/projects/${projectId}/playbook`)}
                >
                  {t('intake.readiness.goFill', '去补')}
                  <ArrowRight size={14} />
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  review.mutate(
                    { docId: requirementDocId, analysisDocumentId: analysisDocId },
                  )
                }
                disabled={review.isPending}
              >
                {review.isPending ? <Spinner size="sm" /> : <Sparkles size={14} />}
                {result
                  ? t('intake.readiness.reRun', '重新评估')
                  : t('intake.readiness.run', '开始评估')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
