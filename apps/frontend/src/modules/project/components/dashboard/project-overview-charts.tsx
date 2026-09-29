import { useTranslation } from '@/hooks/useTranslation';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/components/semantic/chart-card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { ProjectDashboardSummary } from '../../api/project-api';

// TODO: 接入真实燃尽 API——当前为 Figma 基线 mock 数据（data-mock 标记）
const burndownData = [
  { day: 'Mar 1', remaining: 48, ideal: 48 },
  { day: 'Mar 4', remaining: 44, ideal: 42 },
  { day: 'Mar 7', remaining: 38, ideal: 35 },
  { day: 'Mar 10', remaining: 31, ideal: 28 },
  { day: 'Mar 13', remaining: 27, ideal: 21 },
  { day: 'Mar 16', remaining: 22, ideal: 14 },
  { day: 'Mar 19', remaining: 18, ideal: 8 },
];

interface ProjectOverviewChartsProps {
  /** 页面已拉取的 dashboard summary（含 taskStats），组件不自发请求 */
  summary: ProjectDashboardSummary;
}

export function ProjectOverviewCharts({ summary }: ProjectOverviewChartsProps) {
  const { t } = useTranslation();
  const { taskStats } = summary;

  const burndownConfig = {
    remaining: { label: t('project.detail.remaining'), color: 'hsl(var(--accent-blue))' },
    ideal: { label: t('project.detail.ideal'), color: 'hsl(var(--muted-foreground))' },
  } satisfies ChartConfig;

  const distribution = [
    { key: 'done', label: t('project.detail.done'), value: taskStats.done, dotClass: 'bg-accent-green', color: 'hsl(var(--accent-green))' },
    { key: 'inProgress', label: t('project.detail.inProgress'), value: taskStats.inProgress, dotClass: 'bg-accent-blue', color: 'hsl(var(--accent-blue))' },
    { key: 'inReview', label: t('project.detail.inReviewTask'), value: taskStats.inReview, dotClass: 'bg-accent-yellow', color: 'hsl(var(--accent-yellow))' },
    { key: 'todo', label: t('project.detail.todo'), value: taskStats.todo, dotClass: 'bg-muted-foreground', color: 'hsl(var(--muted-foreground))' },
  ] as const;
  const distributionConfig = Object.fromEntries(
    distribution.map((item) => [item.key, { label: item.label, color: item.color }]),
  ) satisfies ChartConfig;
  const distributionData = distribution.map((item) => ({
    status: item.key,
    value: item.value,
    fill: `var(--color-${item.key})`,
  }));

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 卡壳换 semantic/chart-card（2026-09-29）：col-span 与 data-mock 标记留在网格包装层；
          内容内距由原 px-2 pb-3 就近映射到卡壳基线 px-4 pb-4，定高 h-40 移交卡壳 height="md" */}
      <div className="lg:col-span-2" data-mock="true">
        <ChartCard
          title={t('project.detail.sprintBurndown')}
          hint={t('project.detail.last7Days')}
          height="md"
        >
          <ChartContainer config={burndownConfig} className="h-full w-full">
            <AreaChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area
                type="monotone"
                dataKey="ideal"
                stroke="var(--color-ideal)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="remaining"
                stroke="var(--color-remaining)"
                strokeWidth={2}
                fill="var(--color-remaining)"
                fillOpacity={0.12}
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <ChartCard title={t('project.detail.taskDistribution')} height="lg">
        {/* 分布卡：图 + 图例两段，children 内 flex 填满卡壳定高区（h-56），
            图表实现不动，仅高度从自带 h-30 改为随卡壳填充 */}
        <div className="flex h-full flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <ChartContainer config={distributionConfig} className="h-full w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="status"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                />
              </PieChart>
            </ChartContainer>
          </div>
          <div className="mt-1 space-y-1.5">
            {distribution.map((item) => (
              <div key={item.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={cn('h-2.5 w-2.5 rounded-full', item.dotClass)} />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </section>
  );
}
