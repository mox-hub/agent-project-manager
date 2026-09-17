/**
 * 运行失败诊断区（批一 P0 切片 3，2026-09-17 裁决 D）——失败/阻塞 run 的
 * 「为什么失败」两层呈现：
 * ① 机械归类（零 token）：服务端算好随详情返回（failureClassification），
 *    前端只渲染不复制规则（纯函数见 server execution/failure-classifier）；
 * ② 「AI 诊断」按需触发 failure-diagnosis 静默场景（AIUsageLog 记账），
 *    结论可一键「按诊断重试」——recommendation 随血缘写入新执行的
 *    retryContext.diagnosis；escalate（需人处理）时不提供自助重试。
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleHelp, RotateCcw, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { assistantApi } from '@/modules/assistant/api/assistant-api';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';

type FailureCategory = 'environment' | 'input' | 'dependency' | 'unknown';

export interface RunFailureClassification {
  category: FailureCategory;
  hint: string;
}

interface DiagnosisResult {
  category?: string;
  reason?: string;
  recommendation?: string;
  action?: string;
  missingInfo?: unknown;
}

const CATEGORY_KEYS: Record<string, string> = {
  environment: 'runDetails.diagnosis.category.environment',
  input: 'runDetails.diagnosis.category.input',
  dependency: 'runDetails.diagnosis.category.dependency',
  unknown: 'runDetails.diagnosis.category.unknown',
};

const ACTION_KEYS: Record<string, string> = {
  continue: 'runDetails.diagnosis.actionContinue',
  retry_adjusted: 'runDetails.diagnosis.actionRetryAdjusted',
  escalate: 'runDetails.diagnosis.actionEscalate',
};

export function RunDiagnosisSection({
  runId,
  status,
  classification,
  projectId,
  onRetried,
}: {
  runId: string;
  status: string;
  classification?: RunFailureClassification | null;
  projectId?: string | null;
  onRetried?: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const isFailure = status === 'failed' || status === 'blocked';
  const categoryKey =
    result?.category && CATEGORY_KEYS[result.category]
      ? CATEGORY_KEYS[result.category]
      : null;
  const missingInfo = Array.isArray(result?.missingInfo)
    ? (result?.missingInfo as unknown[]).filter(
        (v): v is string => typeof v === 'string' && v.length > 0,
      )
    : [];
  // escalate = 需要人来处理，不给自助重试按钮（避免无意义空转烧 token）
  const canRetryWithDiagnosis =
    !!result?.recommendation && result?.action !== 'escalate';

  const diagnose = useMutation({
    mutationFn: () =>
      assistantApi.silent('failure-diagnosis', {
        projectId: projectId ?? undefined,
        context: { executionRunId: runId },
      }),
    onSuccess: (res) => {
      if (res?.data && typeof res.data === 'object') {
        setResult(res.data as DiagnosisResult);
      } else {
        toast.error(t('runDetails.diagnosis.aiFailed'));
      }
    },
    onError: () => {
      toast.error(t('runDetails.diagnosis.aiFailed'));
    },
  });

  const retryWithDiagnosis = useMutation({
    mutationFn: () =>
      aiHubApi.retryExecution(runId, {
        diagnosis: result?.recommendation ?? undefined,
      }),
    onSuccess: () => {
      toast.success(t('runDetails.diagnosis.retrySuccess'));
      qc.invalidateQueries({ queryKey: ['executions'] });
      onRetried?.();
    },
    onError: (err) => {
      toast.error(
        t('runDetails.diagnosis.aiFailed') +
          ': ' +
          (err instanceof Error ? err.message : String(err)),
      );
    },
  });

  if (!isFailure) return null;

  return (
    <div
      className="shrink-0 space-y-2 border-b bg-muted/30 px-4 py-3"
      data-testid="run-diagnosis-section"
    >
      <div className="flex items-center gap-2">
        <Stethoscope className="size-3.5 text-accent-blue" />
        <span className="text-11 font-medium">
          {t('runDetails.diagnosis.title')}
        </span>
      </div>

      {classification ? (
        <p
          className="flex items-start gap-1.5 text-11 text-content-text"
          data-testid="run-diagnosis-hint"
        >
          <span className="font-medium text-content-text-muted">
            {t('runDetails.diagnosis.mechanicalLabel')}
          </span>
          <span>{classification.hint}</span>
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-10 text-content-text-muted">
            {t(CATEGORY_KEYS[classification.category] ?? CATEGORY_KEYS.unknown)}
          </span>
        </p>
      ) : null}

      {result ? (
        <div
          className="space-y-1.5 rounded-md border bg-background p-2.5"
          data-testid="run-diagnosis-result"
        >
          {categoryKey ? (
            <span className="inline-block rounded-full bg-accent-blue-light px-2 py-0.5 text-10 font-medium text-accent-blue">
              {t(categoryKey)}
            </span>
          ) : null}
          {result.reason ? (
            <p className="text-11 leading-relaxed text-content-text">
              <span className="font-medium text-content-text-muted">
                {t('runDetails.diagnosis.reasonLabel')}
              </span>{' '}
              {result.reason}
            </p>
          ) : null}
          {result.recommendation ? (
            <p className="text-11 leading-relaxed text-content-text">
              <span className="font-medium text-content-text-muted">
                {t('runDetails.diagnosis.recommendationLabel')}
              </span>{' '}
              {result.recommendation}
            </p>
          ) : null}
          {result.action && ACTION_KEYS[result.action] ? (
            <p className="text-11 text-content-text-muted">
              {t(ACTION_KEYS[result.action])}
            </p>
          ) : null}
          {missingInfo.length > 0 ? (
            <p className="flex items-start gap-1 text-11 text-content-text-muted">
              <CircleHelp className="mt-0.5 size-3 shrink-0" />
              <span>
                {t('runDetails.diagnosis.missingInfoLabel')}
                {missingInfo.join('；')}
              </span>
            </p>
          ) : null}
          {canRetryWithDiagnosis ? (
            <Button
              size="sm"
              variant="outline"
              disabled={retryWithDiagnosis.isPending}
              onClick={() => retryWithDiagnosis.mutate()}
              data-testid="run-diagnosis-retry"
            >
              {retryWithDiagnosis.isPending ? (
                <Spinner className="size-3" />
              ) : (
                <RotateCcw className="size-3" />
              )}
              {t('runDetails.diagnosis.retryWithDiagnosis')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!result ? (
        <Button
          size="sm"
          variant="outline"
          disabled={diagnose.isPending}
          onClick={() => diagnose.mutate()}
          data-testid="run-diagnosis-trigger"
        >
          {diagnose.isPending ? (
            <Spinner className="size-3" />
          ) : (
            <Stethoscope className="size-3" />
          )}
          {diagnose.isPending
            ? t('runDetails.diagnosis.aiRunning')
            : t('runDetails.diagnosis.aiButton')}
        </Button>
      ) : null}
    </div>
  );
}
