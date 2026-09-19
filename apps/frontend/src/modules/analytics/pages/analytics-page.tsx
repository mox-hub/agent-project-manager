/**
 * analytics-page.tsx - 全局分析页面（CAP-C-06 消费面去重后口径）
 *
 * 定位分工：运行态实时指标（活跃任务/平均健康分/AI 用量/项目健康表/风险聚焦）
 * 的唯一消费面 = Dashboard（/app/projects/dashboard，useDashboardOverview）；
 * analytics 保留回顾性内容：项目总数 + 项目档案健康 + 剧本健康 + 成本（AI 用量）。
 * Cost Tab 为真实数据（GET /ai/usage，2026-09-19 自设置「AI 用量」页迁入做实）；
 * Quality / Risk / Team 三个 Tab 仍无真实数据源（mock），仅 DEV 可见
 * （import.meta.env.DEV 过滤，生产构建不出现，代码保留）。
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, BarChart3, DollarSign, Activity, ShieldAlert, Users, Zap, AlertTriangle, XCircle, TrendingUp, TrendingDown, Target, Minus, Coins, MessageSquare, Bot, Terminal, type LucideIcon } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { ToolbarRow } from '@/components/ui/toolbar-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { StatsCard } from '@/components/ui/stats-card';
import { ActivityHeatmap } from '@/components/ui/activity-heatmap';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useAnalyticsOverview, usePlaybookHealth, useProfileHealth } from '../hooks/use-analytics-overview';
import { useAiUsage, AI_USAGE_RANGE_OPTIONS, type AiUsageRange } from '../hooks/use-ai-usage';
import { useDashboardOverview } from '@/modules/project/hooks/use-dashboard-overview';
import type { ProfileHealthItem } from '../api/analytics-api';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

// Overview 数据：GET /dashboard/overview（真实端点）；其余 Tab 形态数据走 msw mock（见 use-analytics-overview 注释）
const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' };











// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'text-foreground', trend }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-destructive' : trend === 'down' ? 'text-accent-green' : 'text-muted-foreground';
  return (
    <Card className="py-0">
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className={cn('size-4', color)} />
        </div>
        <div className="flex items-end gap-1.5">
          <p className={cn('text-2xl font-semibold tracking-tight', color)}>{value}</p>
          {trend && <TrendIcon className={cn('size-3.5 mb-0.5', trendColor)} />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Overview（真实 API：GET /dashboard/overview，仅取回顾性字段）──────────────

function OverviewTab() {
  const { data, isLoading, isError, refetch } = useDashboardOverview();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonChart /><SkeletonChart />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col items-center justify-center p-8 text-center">
        <Alert variant="destructive" className="w-full text-left">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法加载分析数据，请稍后重试。</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCwIcon className="mr-1.5 size-3.5" />重试
        </Button>
      </div>
    );
  }

  // CAP-C-06 消费面去重：与 Dashboard 同源的活跃任务/平均健康分/AI 周用量
  // StatCard、项目健康表、风险聚焦卡已移除（真相源 = /app/projects/dashboard）；
  // 此处保留 analytics 独有的回顾性内容：项目总数 + 档案健康 + 剧本健康。
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="项目总数" value={data.health.projects.length} sub="全部项目" icon={Target} color="text-accent-blue" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfileHealthCard />
        <PlaybookHealthCard />
      </div>
    </div>
  );
}

// ── 档案健康卡 / 剧本健康卡（v2 纪要 §4.4 分析，全派生）──────────────────────

function ProfileHealthCard() {
  const { data, isLoading } = useProfileHealth();
  const items = data?.items ?? [];
  const withData = items.filter((i) => i.filled > 0);
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">项目档案健康</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">加载中…</p>
        ) : withData.length === 0 ? (
          <EmptyState
            title="暂无档案数据"
            description="在项目「档案」页触发考古或手动填充后这里会亮起来。"
            className="min-h-20"
          />
        ) : (
          withData.slice(0, 6).map((item) => <ProfileHealthRow key={item.projectId} item={item} />)
        )}
      </CardContent>
    </Card>
  );
}

function ProfileHealthRow({ item }: { item: ProfileHealthItem }) {
  const pct = Math.round((item.filled / item.total) * 100);
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-foreground">{item.projectName}</span>
        <span className="shrink-0 text-muted-foreground">
          {item.filled}/{item.total} 槽位{item.avgConfidence != null ? ` · 置信 ${item.avgConfidence}` : ''}
          {item.staleSlots > 0 ? ` · ${item.staleSlots} 过期` : ''}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div
          className={cn('h-full rounded-full', pct >= 60 ? 'bg-accent-green' : pct >= 30 ? 'bg-accent-yellow' : 'bg-accent-red')}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}

function PlaybookHealthCard() {
  const { data, isLoading } = usePlaybookHealth();
  const stages = data?.stages ?? [];
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">
          项目步骤健康{data && data.mountedProjects > 0 ? ` · ${data.mountedProjects} 个项目挂载` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">加载中…</p>
        ) : stages.length === 0 ? (
          <EmptyState
            title="暂无项目步骤运行数据"
            description="项目「流程」页挂载项目步骤并跑一个阶段后，这里会出现跳过率与退回率。"
            className="min-h-20"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>阶段</TableHead>
                <TableHead>通过</TableHead>
                <TableHead>跳过率</TableHead>
                <TableHead>退回率</TableHead>
                <TableHead>平均停留</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.slice(0, 8).map((s) => (
                <TableRow key={s.stage}>
                  <TableCell className="font-medium">{s.stage}</TableCell>
                  <TableCell>{s.completed}</TableCell>
                  <TableCell className={s.skipRatePct >= 50 ? 'text-accent-yellow' : ''}>{s.skipRatePct}%</TableCell>
                  <TableCell className={s.rejectRatePct >= 50 ? 'text-accent-red' : ''}>{s.rejectRatePct}%</TableCell>
                  <TableCell>{s.avgDurationMs != null ? formatDuration(s.avgDurationMs) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

// ── Tab: Cost（真实数据：GET /ai/usage，2026-09-19 自设置「AI 用量」页迁入做实）──

function formatCost(cost: number): string {
  if (cost > 0 && cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

function formatTokensCompact(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

function CostTab() {
  const { t } = useTranslation();
  const [range, setRange] = useState<AiUsageRange>('30d');
  const { data: usage, isLoading } = useAiUsage(range);
  // 热力图恒为近一年总览：独立全量查询，与上方范围选择解耦（range=all 时同 key 自动去重）
  const { data: usageAll } = useAiUsage('all');

  const byDay = useMemo(() => usage?.byDay ?? [], [usage]);
  const sortedByModel = useMemo(
    () => [...(usage?.byModel ?? [])].sort((a, b) => b.totalTokens - a.totalTokens),
    [usage],
  );
  const heatmapData = useMemo(
    () => (usageAll?.byDay ?? []).map((d) => ({ date: d.day, count: d.totalTokens })),
    [usageAll],
  );

  // 柱状图粒度：7d/30d 按日；all 按月聚合（否则柱数不可读）
  const isMonthly = range === 'all';
  const costBars = useMemo(() => {
    const acc = new Map<string, number>();
    for (const row of byDay) {
      const key = isMonthly ? row.day.slice(0, 7) : row.day.slice(5);
      acc.set(key, (acc.get(key) ?? 0) + (row.totalCost ?? 0));
    }
    return [...acc.entries()].map(([label, cost]) => ({ label, cost }));
  }, [byDay, isMonthly]);

  const barConfig = {
    cost: { label: t('analytics.cost.totalCost'), color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;

  // 范围选择常驻（空态/加载态也保留，否则空范围内用户无法切回有数据的范围）
  const rangeRow = (
    <div className="flex items-center justify-end">
      <NativeSelect
        value={range}
        onChange={(e) => setRange(e.target.value as AiUsageRange)}
        className="w-36 text-xs"
        aria-label={t('analytics.cost.range')}
      >
        {AI_USAGE_RANGE_OPTIONS.map((option) => (
          <NativeSelectOption key={option.id} value={option.id}>
            {t(
              option.id === '7d'
                ? 'analytics.cost.range7d'
                : option.id === '30d'
                  ? 'analytics.cost.range30d'
                  : 'analytics.cost.rangeAll',
            )}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {rangeRow}
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonChart /><SkeletonChart />
        </div>
      </div>
    );
  }

  if (!usage || usage.totalTokens === 0) {
    return (
      <div className="space-y-4">
        {rangeRow}
        <EmptyState
          title={t('analytics.cost.emptyTitle')}
          description={t('analytics.cost.emptyHint')}
          className="min-h-60"
        />
      </div>
    );
  }

  const totalModelCost = sortedByModel.reduce((s, m) => s + (m.totalCost ?? 0), 0);

  return (
    <div className="space-y-4">
      {rangeRow}

      <StatsCard
        columns={6}
        className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        items={[
          {
            key: 'tokens',
            label: t('analytics.cost.totalTokens'),
            value: usage.totalTokens.toLocaleString(),
            icon: Zap,
            colorClass: 'text-accent-blue',
          },
          {
            key: 'cost',
            label: t('analytics.cost.totalCost'),
            value: formatCost(usage.totalCost ?? 0),
            icon: Coins,
            colorClass: 'text-accent-green',
          },
          {
            key: 'totalCalls',
            label: t('analytics.cost.totalCalls'),
            value: (usage.totalCalls ?? 0).toLocaleString(),
            icon: Activity,
            colorClass: 'text-accent-purple',
          },
          {
            key: 'conversationCalls',
            label: t('analytics.cost.conversationCalls'),
            value: (usage.conversationCalls ?? 0).toLocaleString(),
            icon: MessageSquare,
            colorClass: 'text-accent-blue',
          },
          {
            key: 'silentCalls',
            label: t('analytics.cost.silentCalls'),
            value: (usage.silentCalls ?? 0).toLocaleString(),
            icon: Bot,
            colorClass: 'text-accent-yellow',
          },
          {
            key: 'executionCalls',
            label: t('analytics.cost.executionCalls'),
            value: (usage.executionCalls ?? 0).toLocaleString(),
            icon: Terminal,
            colorClass: 'text-accent-orange',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">
              {t(isMonthly ? 'analytics.cost.monthlyCost' : 'analytics.cost.dailyCost')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <ChartContainer config={barConfig} className="h-40 w-full">
              <BarChart data={costBars}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatCost(Number(value))} />}
                />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              {t('analytics.cost.heatmap')}
              <span className="text-xs font-normal text-muted-foreground">
                {t('analytics.cost.heatmapRange')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ActivityHeatmap
              data={heatmapData}
              days={365}
              formatTip={(count) => `${formatTokensCompact(count)} tokens`}
              emptyLabel={t('analytics.cost.noDaily')}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">{t('analytics.cost.byModel')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table className="w-full text-sm">
            <TableHeader className="text-xs text-muted-foreground">
              <TableRow>
                <TableHead className="p-2 text-left">{t('analytics.cost.model')}</TableHead>
                <TableHead className="w-32 p-2 text-right">{t('analytics.cost.tokens')}</TableHead>
                <TableHead className="w-28 p-2 text-right">{t('analytics.cost.cost')}</TableHead>
                <TableHead className="w-40 p-2 text-right">{t('analytics.cost.share')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByModel.map((row) => {
                const sharePct = totalModelCost > 0
                  ? Math.round((row.totalCost / totalModelCost) * 100)
                  : 0;
                return (
                  <TableRow key={row.modelName}>
                    <TableCell className="p-2 font-medium">{row.modelName}</TableCell>
                    <TableCell className="p-2 text-right tabular-nums">{row.totalTokens.toLocaleString()}</TableCell>
                    <TableCell className="p-2 text-right tabular-nums">{formatCost(row.totalCost ?? 0)}</TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={sharePct} className="h-1.5 w-24" />
                        <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">{sharePct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Quality（mock）────────────────────────────────────────────────────────

function QualityTab() {
  const { data: ov } = useAnalyticsOverview();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Quality Score" value="80" sub="across all projects" icon={Activity} color="text-accent-green" />
        <StatCard label="Refactor Ratio" value="32%" sub="of AI changes are refactors" icon={TrendingUp} color="text-accent-blue" trend="down" />
        <StatCard label="Patch Ratio" value="30%" sub="down from 52% in W08" icon={Minus} color="text-accent-yellow" trend="down" />
        <StatCard label="Complexity Drift" value="-12" sub="avg complexity down (good)" icon={BarChart3} color="text-accent-purple" trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Code Change Quality Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ov?.qualityTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="patchPct" stroke="#f59e0b" name="Patch %" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="refactorPct" stroke="#10b981" name="Refactor %" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="complexity" stroke="#7c3aed" name="Complexity" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Quality Score by Project</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {(ov?.qualityByProject ?? []).map(p => (
              <div key={p.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs truncate">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{p.score}</span>
                    <span className="text-10 text-muted-foreground">cov: {p.testCoverage}%</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Progress value={p.score} className="flex-1 h-1.5" />
                  <Progress value={p.testCoverage} className="w-16 h-1.5 opacity-50" />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-1">
              <span className="flex items-center gap-1.5 text-10 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary/70" />Quality</span>
              <span className="flex items-center gap-1.5 text-10 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary/30" />Coverage</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Risk（mock）───────────────────────────────────────────────────────────

function RiskTab() {
  const { data: ov } = useAnalyticsOverview();
  const RISK_TYPE_CFG: Record<string, { label: string; color: string }> = {
    acceptance: { label: 'Acceptance', color: 'bg-destructive/10 text-destructive' },
    cost:       { label: 'Cost',       color: 'bg-accent-yellow/10 text-accent-yellow' },
    delivery:   { label: 'Delivery',   color: 'bg-accent-orange/10 text-accent-orange' },
    quality:    { label: 'Quality',    color: 'bg-accent-blue/10 text-accent-blue' },
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="High Risk Items" value={(ov?.riskItems ?? []).filter(r => r.risk >= 80).length} sub="risk score ≥ 80" icon={ShieldAlert} color="text-destructive" />
        <StatCard label="Medium Risk" value={(ov?.riskItems ?? []).filter(r => r.risk >= 50 && r.risk < 80).length} sub="risk score 50–79" icon={AlertTriangle} color="text-accent-yellow" />
        <StatCard label="Trending Up" value={(ov?.riskItems ?? []).filter(r => r.trend === 'up').length} sub="worsening risks" icon={TrendingUp} color="text-destructive" trend="up" />
        <StatCard label="Improving" value={(ov?.riskItems ?? []).filter(r => r.trend === 'down').length} sub="risk declining" icon={TrendingDown} color="text-accent-green" trend="down" />
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            Risk Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {(ov?.riskItems ?? []).map(item => {
            const typeCfg = RISK_TYPE_CFG[item.type];
            const TrendIcon = item.trend === 'up' ? ArrowUp : item.trend === 'down' ? ArrowDown : Minus;
            const trendColor = item.trend === 'up' ? 'text-destructive' : item.trend === 'down' ? 'text-accent-green' : 'text-muted-foreground';
            const riskColor = item.risk >= 80 ? 'text-destructive' : item.risk >= 50 ? 'text-accent-yellow' : 'text-accent-green';
            return (
              <div key={item.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                item.risk >= 80 ? 'border-destructive/30 bg-destructive/10/40' :
                item.risk >= 50 ? 'border-accent-yellow/30 bg-accent-yellow/10' :
                'border-border bg-card',
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm truncate">{item.title}</span>
                    <span className={cn('text-10 px-1.5 py-0.5 rounded font-medium', typeCfg.color)}>{typeCfg.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.projectName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TrendIcon className={cn('w-3.5 h-3.5', trendColor)} />
                  <div className="w-24">
                    <Progress value={item.risk} className="h-1.5" />
                  </div>
                  <span className={cn('text-sm font-semibold w-8 text-right', riskColor)}>{item.risk}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Team Activity（mock）──────────────────────────────────────────────────

function TeamActivityTab() {
  const { data: ov } = useAnalyticsOverview();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={4} sub="all contributed today" icon={Users} color="text-accent-blue" />
        <StatCard label="AI Executions" value={36} sub="today across all agents" icon={Zap} color="text-accent-purple" />
        <StatCard label="Conflicts Detected" value={2} sub="in agent work overlap" icon={AlertTriangle} color="text-accent-yellow" />
        <StatCard label="Stuck Tasks" value={3} sub="> 5 days, no progress" icon={XCircle} color="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">AI Activity by Member (Today)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ov?.activityTimeline ?? []} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="alex" fill="#3b82f6" name="Alex" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="sarah" fill="#10b981" name="Sarah" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="marcus" fill="#f59e0b" name="Marcus" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="lisa" fill="#7c3aed" name="Lisa" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="james" fill="#ef4444" name="James" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Member AI Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {(ov?.memberActivity ?? []).map(m => (
              <div key={m.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-10 font-semibold shrink-0" style={{ backgroundColor: m.color }}>
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium">{m.name}</span>
                    <span className="text-11 text-muted-foreground">
                      {m.executions} runs · {m.aiHoursUsed}h · {m.acceptancesOwned} acceptances
                    </span>
                  </div>
                  <Progress value={(m.aiHoursUsed / 12) * 100} className="h-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type AnalyticsTab = 'overview' | 'cost' | 'quality' | 'risk' | 'team';

/** Tab 定义：overview / cost 为真实数据回顾面（cost=AI 用量迁移做实）；quality/risk/team 为 mock 形态，devOnly */
interface AnalyticsTabDef {
  value: AnalyticsTab;
  label: string;
  icon: LucideIcon;
  devOnly: boolean;
}

const ANALYTICS_TAB_DEFS: AnalyticsTabDef[] = [
  { value: 'overview', label: '概览', icon: BarChart3, devOnly: false },
  { value: 'cost', label: '成本', icon: DollarSign, devOnly: false },
  { value: 'quality', label: '质量', icon: Activity, devOnly: true },
  { value: 'risk', label: '风险', icon: ShieldAlert, devOnly: true },
  { value: 'team', label: '团队', icon: Users, devOnly: true },
];

/** 可用 Tab 计算（纯函数，测试消费）：mock 形态 Tab 仅 DEV 可见（CAP-C-06） */
export function getAvailableAnalyticsTabs(isDev: boolean): AnalyticsTabDef[] {
  return ANALYTICS_TAB_DEFS.filter((def) => !def.devOnly || isDev);
}

const ANALYTICS_TAB_CONTENT: Record<AnalyticsTab, React.ComponentType> = {
  overview: OverviewTab,
  cost: CostTab,
  quality: QualityTab,
  risk: RiskTab,
  team: TeamActivityTab,
};

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // mock Tab 仅 DEV 可见（生产构建不出现）；默认选中第一个可用 Tab（= overview）
  const availableTabs = useMemo(() => getAvailableAnalyticsTabs(import.meta.env.DEV), []);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(() => {
    const fromUrl = searchParams.get('tab');
    return availableTabs.some((def) => def.value === fromUrl)
      ? (fromUrl as AnalyticsTab)
      : availableTabs[0]?.value ?? 'overview';
  });

  // ?tab= 双向同步：URL 可定位 Tab（设置「AI 用量」重定向 / 分享链接），overview 默认态清参
  const changeTab = (tab: AnalyticsTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };
  const { data: overviewData, refetch: refetchOverview } = useDashboardOverview();

  // CAP-C-06 消费面去重：页头指标只留项目总数（活跃任务/平均健康分真相源在 Dashboard）
  const metrics = useMemo(() => {
    if (!overviewData) return [];
    return [
      { id: 'projects', label: '项目', value: overviewData.health.projects.length },
    ];
  }, [overviewData]);

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.analytics}>
      <PageHeader
        aiId="analytics.overview"
        title={t('analytics.title', '分析')}
        icon={BarChart3}
        iconColor="text-accent-blue"
        metrics={metrics}
        actions={
          <HeaderActionButton
            icon={RefreshCwIcon}
            label="刷新数据"
            onClick={() => {
              refetchOverview();
            }}
            data-ai-component="analytics.refresh"
            data-ai-action="analytics.refresh.click"
          />
        }
      />

      {/* 纯样式切换页：不传 views（视图管理整体隐藏），仅居中 Tab 切换 */}
      <ToolbarRow
        aiId="analytics.overview"
        viewStyle={{
          layout: 'centered',
          value: activeTab,
          onChange: (v) => changeTab(v as AnalyticsTab),
          options: availableTabs.map(({ value, label, icon }) => ({ value, label, icon })),
        }}
        filterMenu={false}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="flex w-full min-w-0 flex-1 flex-col overflow-y-auto px-6 py-4 sm:px-8 sm:py-5 lg:px-10 space-y-4">
        <Tabs value={activeTab} onValueChange={(val) => changeTab(val as AnalyticsTab)} className="w-full">
          {availableTabs.map((def) => {
            const Content = ANALYTICS_TAB_CONTENT[def.value];
            return (
              <TabsContent key={def.value} value={def.value}>
                <Content />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </PageShell>
  );
}
