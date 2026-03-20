import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Radar, RadarChart, PolarAngleAxis, PolarGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ProjectAnalytics } from '../../api/project-api';

export interface AnalyticsModulesState {
  delivery: boolean;
  aiRisk: boolean;
  workload: boolean;
}

interface ProjectAnalyticsPanelProps {
  analytics: ProjectAnalytics;
  modules: AnalyticsModulesState;
  onModulesChange: (value: AnalyticsModulesState) => void;
}

export function ProjectAnalyticsPanel({
  analytics,
  modules,
  onModulesChange,
}: ProjectAnalyticsPanelProps) {
  const hasAnyModule = modules.delivery || modules.aiRisk || modules.workload;

  const workloadData = useMemo(
    () =>
      analytics.workloadDistribution.map((item) => ({
        ...item,
        shortLabel: item.label.length > 10 ? `${item.label.slice(0, 10)}...` : item.label,
      })),
    [analytics.workloadDistribution],
  );

  return (
    <section className="space-y-4">
      <Card className="border-content-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Analytics Modules</CardTitle>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={modules.delivery}
                onChange={(e) => onModulesChange({ ...modules, delivery: e.target.checked })}
              />
              Delivery Efficiency
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={modules.aiRisk}
                onChange={(e) => onModulesChange({ ...modules, aiRisk: e.target.checked })}
              />
              AI Risk & Complexity
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={modules.workload}
                onChange={(e) => onModulesChange({ ...modules, workload: e.target.checked })}
              />
              Workload Balance
            </label>
          </div>
        </CardHeader>
      </Card>

      {!hasAnyModule ? (
        <Card className="border-content-border">
          <CardContent className="py-8 text-center text-sm text-content-text-secondary">
            已关闭全部模块，请至少启用一个图表模块。
          </CardContent>
        </Card>
      ) : null}

      {modules.delivery ? (
        <Card className="border-content-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Delivery Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[280px] w-full"
              config={{
                healthScore: { label: 'Health Score', color: 'hsl(var(--chart-1))' },
                deliveryScore: { label: 'Delivery Score', color: 'hsl(var(--chart-2))' },
              }}
            >
              <LineChart data={analytics.deliveryTimeline}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="healthScore" stroke="var(--color-healthScore)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="deliveryScore" stroke="var(--color-deliveryScore)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      {modules.aiRisk ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-content-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AI Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-[260px] w-full"
                config={{ value: { label: 'Risk', color: 'hsl(var(--chart-3))' } }}
              >
                <AreaChart data={analytics.aiRiskDistribution}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" fill="var(--color-value)" stroke="var(--color-value)" fillOpacity={0.22} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-content-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AI Complexity Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-[260px] w-full"
                config={{ value: { label: 'Index', color: 'hsl(var(--chart-4))' } }}
              >
                <RadarChart data={analytics.aiComplexityDistribution}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="label" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Radar dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.35} />
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {modules.workload ? (
        <Card className="border-content-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workload Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[280px] w-full"
              config={{ value: { label: 'Task Share', color: 'hsl(var(--chart-5))' } }}
            >
              <BarChart data={workloadData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="shortLabel" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

