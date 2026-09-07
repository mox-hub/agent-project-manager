/**
 * AiUsageSection - 设置页「AI 用量」子页
 * @description 汇总卡片（总 Token/总成本/调用次数）+ 按模型聚合表 + 按日趋势表；
 * 数据源 GET /ai/usage（AIUsageLog 聚合，LLM 对话/静默/CLI 执行三路统一记账）。
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Coins, ListOrdered, Zap } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslation } from '@/hooks/useTranslation';
import { aiHubApi, type UsageStats } from '@/modules/ai-hub/api/ai-hub-api';

type RangeId = '7d' | '30d' | 'all';

const RANGE_OPTIONS: Array<{ id: RangeId; days?: number }> = [
  { id: '7d', days: 7 },
  { id: '30d', days: 30 },
  { id: 'all' },
];

function formatCost(cost: number): string {
  if (cost > 0 && cost < 0.01) return `<$0.01`;
  return `$${cost.toFixed(2)}`;
}

export function AiUsageSection() {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeId>('30d');

  const from = useMemo(() => {
    const option = RANGE_OPTIONS.find((r) => r.id === range);
    if (!option?.days) return undefined;
    const date = new Date();
    date.setDate(date.getDate() - option.days);
    return date.toISOString();
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-usage', range],
    queryFn: () => aiHubApi.getUsage(from ? { from } : undefined),
  });
  const usage = data as UsageStats | undefined;

  const sortedByModel = useMemo(
    () => [...(usage?.byModel ?? [])].sort((a, b) => b.totalTokens - a.totalTokens),
    [usage],
  );

  return (
    <PageShell aiPage="settings.ai-usage">
      <PageHeader
        aiId="settings.ai-usage"
        title={t('settings.aiUsage')}
        icon={BarChart3}
        iconColor="text-accent-blue"
      />

      <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-2 md:px-7">
        <NativeSelect
          value={range}
          onChange={(e) => setRange(e.target.value as RangeId)}
          className="w-36 text-xs"
          aria-label={t('settings.aiUsageRange')}
        >
          {RANGE_OPTIONS.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {t(
                option.id === '7d'
                  ? 'settings.aiUsageRange7d'
                  : option.id === '30d'
                    ? 'settings.aiUsageRange30d'
                    : 'settings.aiUsageRangeAll',
              )}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !usage || usage.totalTokens === 0 ? (
          <EmptyState
            title={t('settings.aiUsageEmpty')}
            description={t('settings.aiUsageEmptyHint')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <StatsCard
              columns={3}
              items={[
                {
                  key: 'tokens',
                  label: t('settings.aiUsageTotalTokens'),
                  value: usage.totalTokens.toLocaleString(),
                  icon: Zap,
                  colorClass: 'text-accent-blue',
                },
                {
                  key: 'cost',
                  label: t('settings.aiUsageTotalCost'),
                  value: formatCost(usage.totalCost ?? 0),
                  icon: Coins,
                  colorClass: 'text-accent-green',
                },
                {
                  key: 'models',
                  label: t('settings.aiUsageModels'),
                  value: String(usage.byModel.length),
                  icon: ListOrdered,
                  colorClass: 'text-accent-purple',
                },
              ]}
            />

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListOrdered size={16} className="text-accent-blue" />
                  {t('settings.aiUsageByModel')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="w-full text-sm">
                  <TableHeader className="text-xs text-muted-foreground">
                    <TableRow>
                      <TableHead className="p-2 text-left">
                        {t('settings.aiUsageModel')}
                      </TableHead>
                      <TableHead className="w-32 p-2 text-right">
                        {t('settings.aiUsageTokens')}
                      </TableHead>
                      <TableHead className="w-28 p-2 text-right">
                        {t('settings.aiUsageCost')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedByModel.map((row) => (
                      <TableRow key={row.modelName}>
                        <TableCell className="p-2 font-medium">
                          {row.modelName}
                        </TableCell>
                        <TableCell className="p-2 text-right tabular-nums">
                          {row.totalTokens.toLocaleString()}
                        </TableCell>
                        <TableCell className="p-2 text-right tabular-nums">
                          {formatCost(row.totalCost ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 size={16} className="text-accent-blue" />
                  {t('settings.aiUsageByDay')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(usage.byDay ?? []).length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      title={t('settings.aiUsageNoDaily')}
                    />
                  </div>
                ) : (
                  <Table className="w-full text-sm">
                    <TableHeader className="text-xs text-muted-foreground">
                      <TableRow>
                        <TableHead className="p-2 text-left">
                          {t('settings.aiUsageDay')}
                        </TableHead>
                        <TableHead className="w-32 p-2 text-right">
                          {t('settings.aiUsageTokens')}
                        </TableHead>
                        <TableHead className="w-28 p-2 text-right">
                          {t('settings.aiUsageCost')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(usage.byDay ?? []).map((row) => (
                        <TableRow key={row.day}>
                          <TableCell className="p-2 font-medium">
                            {row.day}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums">
                            {row.totalTokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums">
                            {formatCost(row.totalCost ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </PageShell>
  );
}
