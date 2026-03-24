import { AlertCircle, ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttentionRail } from '@/components/ui/attention-rail';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useAnalyticsOverview } from '../hooks/use-analytics-overview';

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <ArrowUp size={14} className="text-accent-green" />;
  if (trend === 'down') return <ArrowDown size={14} className="text-accent-red" />;
  return <ArrowRight size={14} className="text-content-text-muted" />;
}

export function AnalyticsPage() {
  const { data, isLoading, isError } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-content-bg p-8 text-sm text-content-text-secondary">
        正在加载分析看板...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-content-bg p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-red-light">
          <AlertCircle size={32} className="text-accent-red" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-accent-red">分析数据加载失败</h2>
      </div>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.analytics}>
      <div className="mx-auto w-full max-w-[1280px]">
        <PageHeader
          aiId="analytics.overview"
          title="Analytics"
          description="跨模块交付质量、风险趋势和 AI 执行效率总览。"
        />

        <section
          className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4"
          data-ai-component="analytics.overview.context-bar"
          data-ai-role="filter"
        >
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-content-text-muted">项目总数</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold text-content-text">
              {data.totalProjects}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-content-text-muted">活跃 Agent</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold text-content-text">
              {data.activeAgents}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-content-text-muted">交付率</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold text-content-text">
              {data.deliveryRate}%
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-content-text-muted">质量评分</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold text-content-text">
              {data.qualityScore}
            </CardContent>
          </Card>
        </section>

        <section
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          data-ai-component="analytics.overview.primary-content"
          data-ai-role="content"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">模块健康度</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模块</TableHead>
                    <TableHead>负责人</TableHead>
                    <TableHead>评分</TableHead>
                    <TableHead>趋势</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.moduleStatus.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">{module.name}</TableCell>
                      <TableCell>{module.owner}</TableCell>
                      <TableCell>{module.score}</TableCell>
                      <TableCell>
                        <TrendArrow trend={module.trend} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">风险聚焦</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.risks.map((risk) => (
                <div
                  key={risk.id}
                  className="rounded-lg border border-content-border bg-content-bg-secondary p-3"
                >
                  <p className="text-sm font-medium text-content-text">{risk.project}</p>
                  <p className="mt-1 text-xs text-content-text-secondary">{risk.summary}</p>
                  <p className="mt-1 text-xs text-content-text-muted">建议: {risk.action}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <AttentionRail
          aiPrefix="analytics.overview"
          items={[
            {
              id: 'goto-projects',
              title: '返回项目工作区',
              description: '按风险优先级处理项目任务',
              to: '/app/projects',
            },
            {
              id: 'goto-documents',
              title: '查看文档库',
              description: '同步规范和决策上下文',
              to: '/app/documents',
            },
            {
              id: 'goto-ai',
              title: 'AI 深度分析',
              description: '结合健康度生成改进动作',
              to: '/app/ai',
            },
          ]}
        />
      </div>
    </PageShell>
  );
}
