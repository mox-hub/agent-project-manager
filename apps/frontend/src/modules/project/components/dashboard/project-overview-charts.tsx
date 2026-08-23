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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card className="lg:col-span-2" data-mock="true">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            {t('project.detail.sprintBurndown')}
            <span className="text-xs font-normal text-muted-foreground">
              {t('project.detail.last7Days')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ChartContainer config={burndownConfig} className="h-40 w-full">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium">
            {t('project.detail.taskDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center">
            <ChartContainer config={distributionConfig} className="h-30 w-full">
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
        </CardContent>
      </Card>
    </section>
  );
}
