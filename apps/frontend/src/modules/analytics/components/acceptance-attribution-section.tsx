/**
 * AcceptanceAttributionSection - 成本 Tab「验收归因」区（CAP-C-06，G8 缺口兑现）
 *
 * 数据源 = GET /ai/usage/acceptance-attribution：执行链成本（AIUsageLog.executionRunId）
 * 经 Execution → Issue → Acceptance 归因链落到验收单。
 * 三段结构：汇总卡（单位验收成本/返工成本/返工占比）→ 验收单明细表（成本降序，
 * 后端上限 50）→ 工单类型返工分布条形列表（回答「哪类任务反复失败」）。
 * 诚实空态：无执行成本显示「暂无执行成本数据」；无验收单时单位验收成本显示「—」。
 */
import { Percent, RotateCcw, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/semantic/empty-state';
import { Progress } from '@/components/ui/progress';
import { StatsCard } from '@/components/semantic/stats-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { useAcceptanceAttribution } from '../hooks/use-acceptance-attribution';

/** 成本展示（与 CostTab 同口径：<$0.01 防零抖，两位小数） */
function formatCost(cost: number): string {
  if (cost > 0 && cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

export function AcceptanceAttributionSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useAcceptanceAttribution();

  if (isLoading) {
    return <SkeletonCard />;
  }

  // 诚实空态：执行链尚无成本记录（而非显示全 0 假象）
  if (!data || data.totalExecutionCost === 0) {
    return (
      <EmptyState
        title={t('analytics.cost.attributionEmptyTitle')}
        description={t('analytics.cost.attributionEmptyHint')}
        className="min-h-40"
      />
    );
  }

  // 返工分布条形的归一化分母（全零时按 1 防 NaN）
  const maxRework = Math.max(
    1,
    ...data.byIssueType.map((row) => row.reworkCount),
  );

  return (
    <div className="space-y-4">
      <StatsCard
        columns={3}
        items={[
          {
            key: 'avgCost',
            label: t('analytics.cost.attributionAvgCost'),
            value:
              data.avgCostPerAcceptance != null
                ? formatCost(data.avgCostPerAcceptance)
                : '—',
            icon: Target,
            tone: 'green',
            hint:
              data.avgCostPerAcceptance == null
                ? t('analytics.cost.attributionAvgEmptyHint')
                : undefined,
          },
          {
            key: 'reworkCost',
            label: t('analytics.cost.attributionReworkCost'),
            value: formatCost(data.reworkCost),
            icon: RotateCcw,
            tone: 'orange',
          },
          {
            key: 'reworkPct',
            label: t('analytics.cost.attributionReworkPct'),
            value: `${Math.round(data.reworkPct)}%`,
            icon: Percent,
            tone: 'red',
          },
        ]}
      />

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">
            {t('analytics.cost.attributionTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {data.byAcceptance.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('analytics.cost.attributionNoAcceptance')}
            </p>
          ) : (
            <Table className="w-full text-sm">
              <TableHeader className="text-xs text-muted-foreground">
                <TableRow>
                  <TableHead className="p-2 text-left">
                    {t('analytics.cost.attributionAcceptance')}
                  </TableHead>
                  <TableHead className="p-2 text-left">
                    {t('analytics.cost.attributionIssue')}
                  </TableHead>
                  <TableHead className="p-2 text-left">
                    {t('analytics.cost.attributionIssueType')}
                  </TableHead>
                  <TableHead className="w-20 p-2 text-right">
                    {t('analytics.cost.attributionExecutionCount')}
                  </TableHead>
                  <TableHead className="w-20 p-2 text-right">
                    {t('analytics.cost.attributionReworkCount')}
                  </TableHead>
                  <TableHead className="w-24 p-2 text-right">
                    {t('analytics.cost.attributionCost')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byAcceptance.map((row) => (
                  <TableRow key={row.acceptanceId}>
                    <TableCell className="max-w-40 truncate p-2 font-medium">
                      {row.acceptanceTitle ?? row.issueTitle}
                    </TableCell>
                    <TableCell className="max-w-40 truncate p-2">
                      {row.issueTitle}
                    </TableCell>
                    <TableCell className="p-2 text-muted-foreground">
                      {row.issueTypeName}
                    </TableCell>
                    <TableCell className="p-2 text-right tabular-nums">
                      {row.executionCount}
                    </TableCell>
                    <TableCell
                      className={`p-2 text-right tabular-nums${row.reworkCount > 0 ? ' font-medium text-accent-orange' : ''}`}
                    >
                      {row.reworkCount}
                    </TableCell>
                    <TableCell className="p-2 text-right tabular-nums">
                      {formatCost(row.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">
            {t('analytics.cost.attributionReworkDist')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2.5">
          {data.byIssueType.map((row) => (
            <div key={row.issueTypeName} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-foreground">
                  {row.issueTypeName}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  <span>{t('analytics.cost.attributionReworkCountUnit', { n: row.reworkCount })}</span>
                  {' · '}
                  <span>{formatCost(row.cost)}</span>
                </span>
              </div>
              <Progress
                value={(row.reworkCount / maxRework) * 100}
                className="h-1.5"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
