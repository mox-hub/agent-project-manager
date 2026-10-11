/**
 * GlobalOverviewPanels - 全局仪表盘趋势面板（团队生产力/健康分趋势/团队表现/优先级构成/成本概览）
 *
 * 图表双引擎切片（2026-09-30）+ 图表重设计批（2026-10-11，参考 dsh-context 仪表盘风格）：
 * - Glance 层：ChartCard + ChartContainer（recharts），按 lieflat-charts skill 语法重设计——
 *   标题写结论（交付节奏动态判断）、hint 即编码说明（一柱 = 一天）、footer 来源行签名、
 *   动画 240ms + 双柱 stagger 80ms（宪法 §7 白名单）、空态 EmptyState（§17.5）、
 *   aria-label 概括结论（§17.6）。色板每图系列按序 --chart-1..5（§17.2）。
 *   重设计批：生产力/健康分趋势柱形改细柱圆顶（barSize + radius，对标参考图 Context Trend）；
 *   成本概览由横条改 semantic/donut-chart 环形占比（中心月合计 + 图例网格）；
 *   新增 semantic/proportion-bar 工单优先级构成条（斜纹余量 = 未完成占比），
 *   数据取自 overview.delivery.byPriority（此前只在下钻弹窗可见）。
 * - Lupi 层：健康分/交付节奏两卡带精读入口 → LupiChartDialog 全屏弹窗（iframe 模板）。
 * quality 为 0-100 百分比量纲，与 tasks/velocity 计数不同轴，不上坐标系，摘要化进 hint。
 * col-span 与网格包装留在调用方（ChartCard 不接 className）。
 */
import { useState } from 'react';
import { Activity, DollarSign, Maximize2, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChartCard } from '@/components/semantic/chart-card';
import { DonutChart } from '@/components/semantic/donut-chart';
import { ProportionBar } from '@/components/semantic/proportion-bar';
import { EmptyState } from '@/components/semantic/empty-state';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCompact, formatDateShort } from '@/lib/format';
import { LupiChartDialog, type LupiPairedRungsPayload, type LupiHairlinePayload } from './lupi-chart-dialog';
import type { DashboardOverview } from '../../api/dashboard-api';

type Trends = DashboardOverview['trends'];
type CostCategory = DashboardOverview['cost']['byCategory'][number];
type PrioritySlice = DashboardOverview['delivery']['byPriority'][number];

const BAR_RADIUS_V: [number, number, number, number] = [2, 2, 0, 0];
const BAR_RADIUS_H: [number, number, number, number] = [0, 2, 2, 0];
const CHART_MOTION = { animationDuration: 240, animationEasing: 'ease-out' } as const;

function ChartEmpty() {
  const { t } = useTranslation();
  return <EmptyState variant="card" title={t('dashboard.panel.chartEmpty')} className="h-full" />;
}

/** 精读入口按钮（Lupi 层入口，G 类语汇：ghost icon-sm） */
function LupiExpandButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button variant="ghost" size="icon-sm" aria-label={t('dashboard.panel.lupiExpand')} onClick={onClick}>
      <Maximize2 />
    </Button>
  );
}

// ─── 团队生产力（Glance 重设计：标题写结论）+ Lupi 精读（paired rungs）───
function ProductivityPanel({ data }: { data: Trends['productivity'] }) {
  const { t } = useTranslation();
  const [lupiOpen, setLupiOpen] = useState(false);
  const sumDone = data.reduce((acc, item) => acc + item.tasks, 0);
  const sumCreated = data.reduce((acc, item) => acc + item.velocity, 0);
  const hasActivity = sumDone > 0 || sumCreated > 0;
  const conclusionKey =
    sumDone > sumCreated ? 'conclusionDraining' : sumDone < sumCreated ? 'conclusionGrowing' : 'conclusionBalanced';
  const title = hasActivity ? t(`dashboard.panel.${conclusionKey}`) : t('dashboard.panel.deliveryTitle');
  const hint = hasActivity
    ? `${t('dashboard.panel.deliveryEncoding')} · ${t('dashboard.panel.qualityHint', { value: data[data.length - 1].quality })}`
    : undefined;
  const config = {
    tasks: { label: t('dashboard.panel.legendTasks'), color: 'hsl(var(--chart-1))' },
    velocity: { label: t('dashboard.panel.legendVelocity'), color: 'hsl(var(--chart-2))' },
  } satisfies ChartConfig;
  const lupiPayload: LupiPairedRungsPayload = {
    title,
    sub: t('dashboard.panel.lupiDeliverySub'),
    src: 'PAIRED RUNGS · LIEFLAT · DELIVERY',
    items: data.slice(-6).map((item) => ({
      label: item.date.slice(5),
      done: item.tasks,
      created: item.velocity,
    })),
  };

  return (
    <ChartCard
      title={title}
      hint={hint}
      action={
        <>
          <LupiExpandButton onClick={() => setLupiOpen(true)} />
          <TrendingUp className="size-4 text-accent-green" />
        </>
      }
      height="lg"
      footer="DELIVERY · LAST 7 DAYS"
    >
      {hasActivity ? (
        <ChartContainer
          config={config}
          role="img"
          aria-label={t('dashboard.panel.ariaProductivity')}
          className="h-full w-full"
        >
          <BarChart data={data.slice(-6)} margin={{ top: 4 }} barCategoryGap="30%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => formatDateShort(value)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              allowDecimals={false}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="tasks" fill="var(--color-tasks)" radius={BAR_RADIUS_V} barSize={10} {...CHART_MOTION} />
            <Bar dataKey="velocity" fill="var(--color-velocity)" radius={BAR_RADIUS_V} barSize={10} animationBegin={80} {...CHART_MOTION} />
          </BarChart>
        </ChartContainer>
      ) : (
        <ChartEmpty />
      )}
      <LupiChartDialog kind="delivery" payload={lupiPayload} open={lupiOpen} onClose={() => setLupiOpen(false)} />
    </ChartCard>
  );
}

// ─── 健康分趋势 + Lupi 精读（hairline）───
function HealthTrendPanel({ data }: { data: Trends['health'] }) {
  const { t } = useTranslation();
  const [lupiOpen, setLupiOpen] = useState(false);
  const config = {
    score: { label: t('dashboard.kpis.health'), color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;
  const lupiPayload: LupiHairlinePayload = {
    title: t('dashboard.panel.lupiHealthTitle'),
    sub: t('dashboard.panel.lupiHealthSub'),
    src: 'HEALTH HAIRLINE · LIEFLAT · WEEKLY',
    max: 100,
    points: data.map((item) => ({ label: item.week, value: item.score })),
  };

  return (
    <ChartCard
      title={t('dashboard.panel.healthTrend')}
      hint={t('dashboard.panel.healthEncoding')}
      action={
        <>
          <LupiExpandButton onClick={() => setLupiOpen(true)} />
          <Activity className="size-4 text-accent-blue" />
        </>
      }
      height="lg"
      footer="HEALTH · WEEKLY · 0-100"
    >
      {data.length > 0 ? (
        <ChartContainer
          config={config}
          role="img"
          aria-label={t('dashboard.panel.ariaHealth')}
          className="h-full w-full"
        >
          <BarChart data={data} margin={{ top: 16 }} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={24} hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="score" fill="var(--color-score)" radius={BAR_RADIUS_V} barSize={12} {...CHART_MOTION}>
              <LabelList dataKey="score" position="top" className="fill-foreground font-medium" />
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <ChartEmpty />
      )}
      <LupiChartDialog kind="health" payload={lupiPayload} open={lupiOpen} onClose={() => setLupiOpen(false)} />
    </ChartCard>
  );
}

// ─── 团队表现：横向条形图（chart-1），条尾数值，0-100 定域 ───
function PerformancePanel({ data }: { data: Trends['performance'] }) {
  const { t } = useTranslation();
  const config = {
    value: { label: t('dashboard.panel.performance'), color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;

  return (
    <ChartCard
      title={t('dashboard.panel.performance')}
      hint={t('dashboard.panel.performanceEncoding')}
      height="md"
      footer="TEAM METRICS · 0-100"
    >
      {data.length > 0 ? (
        <ChartContainer
          config={config}
          role="img"
          aria-label={t('dashboard.panel.ariaPerformance')}
          className="h-full w-full"
        >
          <BarChart data={data} layout="vertical" margin={{ right: 32 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="metric"
              tickLine={false}
              axisLine={false}
              width={88}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={BAR_RADIUS_H} barSize={12} {...CHART_MOTION}>
              <LabelList dataKey="value" position="right" className="fill-foreground font-medium" />
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <ChartEmpty />
      )}
    </ChartCard>
  );
}

// ─── 优先级构成：分段比例条（proportion-bar，斜纹余量 = 尚未落账的工单）───
function PriorityPanel({ data, totalTasks }: { data: PrioritySlice[]; totalTasks: number }) {
  const { t } = useTranslation();
  const rows = data.filter((item) => item.count > 0);

  return (
    <ChartCard
      title={t('dashboard.panel.priority')}
      hint={t('dashboard.panel.priorityEncoding')}
      height="md"
      footer="TASKS · BY PRIORITY"
    >
      {rows.length > 0 ? (
        <div className="flex h-full flex-col justify-center">
          <ProportionBar
            ariaLabel={t('dashboard.panel.ariaPriority')}
            segments={rows.map((item) => ({
              key: item.priority,
              label: <span className="capitalize">{item.priority}</span>,
              value: item.count,
            }))}
            total={totalTasks}
          />
        </div>
      ) : (
        <ChartEmpty />
      )}
    </ChartCard>
  );
}

// ─── 成本概览：环形占比图（donut-chart，中心月合计 + 图例网格，2026-10-11 重设计批）───
function CostPanel({ data, monthTotal }: { data: CostCategory[]; monthTotal: number }) {
  const { t } = useTranslation();
  const rows = data.filter((item) => item.amount > 0);
  const total = monthTotal > 0 ? monthTotal : rows.reduce((acc, item) => acc + item.amount, 0);
  const formatCost = (value: number) =>
    value > 0 && value < 0.01 ? '<$0.01' : `$${value.toFixed(2)}`;

  return (
    <ChartCard
      title={t('dashboard.panel.cost')}
      hint={t('dashboard.panel.costEncoding')}
      action={<DollarSign className="size-4 text-accent-green" />}
      height="md"
      footer="COST · LAST 30 DAYS"
    >
      {rows.length > 0 ? (
        <div className="flex h-full flex-col justify-center">
          <DonutChart
            size="sm"
            legendColumns={1}
            total={formatCost(total)}
            totalLabel={t('dashboard.panel.costTotal')}
            formatValue={formatCost}
            ariaLabel={t('dashboard.panel.ariaCost')}
            items={rows.map((item) => ({ key: item.name, label: item.name, value: item.amount }))}
          />
        </div>
      ) : (
        <ChartEmpty />
      )}
    </ChartCard>
  );
}

export function GlobalOverviewPanels({
  trends,
  cost,
  delivery,
}: {
  trends: Trends;
  cost: DashboardOverview['cost'];
  delivery: DashboardOverview['delivery'];
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ProductivityPanel data={trends.productivity} />
        <HealthTrendPanel data={trends.health} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <PerformancePanel data={trends.performance} />
        <PriorityPanel data={delivery.byPriority} totalTasks={delivery.totalTasks} />
        <CostPanel data={cost.byCategory} monthTotal={cost.monthTotal} />
      </div>
    </>
  );
}
