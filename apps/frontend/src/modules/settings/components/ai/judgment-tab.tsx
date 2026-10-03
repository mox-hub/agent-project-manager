/**
 * 「判断介入」Tab（CAP-A-27 扩展批）——JEV 快速判断的统一管控面：
 * ①总开关与通道信息；②场景介入矩阵（每场景独立开关，显式关闭才禁用、默认跟随总开关）；
 * ③判定记录流水（AIUsageLog kind=judge 的读侧投影——结论+置信度+tokens 可审计）。
 * overview 页的快捷开关保留为入口；本页是完整配置面。
 */
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Scale, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { AiVerdictPill } from '@/components/semantic/ai-verdict-pill';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useQuickJudgeLogs,
  useQuickJudgeSettings,
  useUpdateQuickJudgeSettings,
} from '@/modules/ai-hub/hooks/use-quick-judge-settings';

/**
 * 场景介入点目录（与 server quick-judge.service 注册表对齐；文案在 i18n
 * `aiJudge.scenario.<id>.*`）。批三新场景（failure_classify/completion_type/
 * audit_coverage）与批二（acceptance_probability/decision_option）随批启用。
 */
const JUDGE_SCENARIOS = [
  'approval_risk',
  'evidence_precheck',
  'intake_readiness',
  'intake_decomposition',
  'contract_drift',
  'trust_evaluation',
  'decision_suggestion',
  'decision_option',
  'acceptance_probability',
  'workflow_judge',
  'failure_classify',
  'completion_type',
  'audit_coverage',
] as const;

const PAGE_SIZE = 20;

function MasterSwitchCard() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { data: settings, isLoading } = useQuickJudgeSettings();
  const update = useUpdateQuickJudgeSettings();

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-accent-purple" />
          {t('aiHub.quickJudge')}
        </CardTitle>
        <CardDescription>{t('aiHub.quickJudgeNote')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
          <span className="min-w-0">
            <span className="block text-sm font-medium">{t('aiHub.quickJudgeToggle')}</span>
            <span className="block text-xs text-muted-foreground">
              {isLoading
                ? t('aiHub.quickJudgeLoading')
                : settings?.enabled
                  ? t('aiHub.quickJudgeOnHint', { model: settings.model })
                  : t('aiHub.quickJudgeOffHint')}
            </span>
          </span>
          <Switch
            checked={settings?.enabled ?? false}
            disabled={!isAdmin || update.isPending || isLoading}
            onCheckedChange={(v) => update.mutate({ enabled: v })}
            aria-label={t('aiHub.quickJudgeToggle')}
          />
        </div>
        {settings && (
          <p className="font-mono text-2xs text-content-text-muted">
            {settings.provider} · {settings.model} · {settings.baseUrl}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ScenarioMatrix() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { data: settings, isLoading } = useQuickJudgeSettings();
  const update = useUpdateQuickJudgeSettings();
  const enabled = settings?.enabled ?? false;

  const toggleScenario = (id: string, on: boolean) => {
    // scenarios 增量合并：传键覆盖——false=显式禁用；true=显式恢复跟随总开关
    update.mutate({ scenarios: { [id]: on } });
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="size-4 text-accent-purple" />
          {t('aiJudge.matrixTitle')}
        </CardTitle>
        <CardDescription>
          {enabled
            ? t('aiJudge.matrixDescOn')
            : t('aiJudge.matrixDescOff')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {JUDGE_SCENARIOS.map((id) => {
              const disabledByUser = settings?.scenarios?.[id] === false;
              return (
                <div
                  key={id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2',
                    !enabled && 'opacity-60',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {t(`aiJudge.scenario.${id}.name`)}
                    </span>
                    <span className="block truncate text-xs text-content-text-muted">
                      {t(`aiJudge.scenario.${id}.desc`)}
                    </span>
                  </span>
                  <Switch
                    checked={enabled && !disabledByUser}
                    disabled={!isAdmin || !enabled || update.isPending}
                    onCheckedChange={(v) => toggleScenario(id, v)}
                    aria-label={t(`aiJudge.scenario.${id}.name`)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 单条答案摘要 → 展示值（choice 走原文；noul/score 数值；置信度并入徽注） */
function AnswerChip({
  id,
  answer,
}: {
  id: string;
  answer: { value: number | string | null; confidence: number | null };
}) {
  const { t } = useTranslation();
  if (answer.value === null) {
    return <span className="font-mono text-2xs text-content-text-muted">{id}: —</span>;
  }
  const raw = String(answer.value);
  // noul/score 语义：0-1 概率或 0-9 档分数——数值直接百分比/原值展示，choice 展示枚举原文
  const pctLike =
    typeof answer.value === 'number' && answer.value >= 0 && answer.value <= 1;
  return (
    <AiVerdictPill
      size="xs"
      label={`${id}: ${pctLike ? `${Math.round((answer.value as number) * 100)}%` : raw}`}
      confidence={answer.confidence ?? undefined}
    />
  );
}

function JudgeLogsPanel() {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState<string>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuickJudgeLogs({
    scenario: scenario || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t('aiJudge.logsTitle')}</CardTitle>
        <CardDescription>{t('aiJudge.logsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setScenario('');
              setPage(1);
            }}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              scenario === ''
                ? 'border-accent-purple/40 bg-accent-purple-light/40 text-accent-purple'
                : 'border-border text-content-text-secondary hover:bg-muted/50',
            )}
          >
            {t('aiJudge.logsFilterAll')}
          </button>
          {JUDGE_SCENARIOS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setScenario(id);
                setPage(1);
              }}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                scenario === id
                  ? 'border-accent-purple/40 bg-accent-purple-light/40 text-accent-purple'
                  : 'border-border text-content-text-secondary hover:bg-muted/50',
              )}
            >
              {t(`aiJudge.scenario.${id}.name`)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            {t('aiJudge.logsEmpty')}
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map((log) => (
              <div
                key={log.id}
                data-ai-component="quick-judge-log-row"
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium">
                    {t(`aiJudge.scenario.${log.scenario}.name`)}
                  </span>
                  <span className="font-mono text-2xs text-content-text-muted">
                    {log.model} · {log.totalTokens}t
                  </span>
                  <span className="ml-auto font-mono text-2xs text-content-text-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {Object.entries(log.answers).map(([qid, ans]) => (
                    <AnswerChip key={qid} id={qid} answer={ans} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {(data?.total ?? 0) > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2 text-xs text-content-text-secondary">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border p-1 disabled:opacity-40"
              aria-label={t('common.prevPage')}
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="font-mono tabular-nums">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border p-1 disabled:opacity-40"
              aria-label={t('common.nextPage')}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function JudgmentTab() {
  return (
    <div className="space-y-6" data-ai-component="ai-hub.judgment-tab">
      <MasterSwitchCard />
      <ScenarioMatrix />
      <JudgeLogsPanel />
    </div>
  );
}
