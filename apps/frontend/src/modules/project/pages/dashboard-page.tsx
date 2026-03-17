import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle, ChevronRight, Lightbulb, Zap } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { AttentionRail } from '@/components/ui/attention-rail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectList } from '../hooks/use-project-list';
import { useAppStore } from '@/infrastructure/store/app-store';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';

type InsightItem = {
  id: string;
  type: 'suggestion' | 'warning';
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
};

const AI_INSIGHTS: InsightItem[] = [
  {
    id: 'task-suggestion',
    type: 'suggestion',
    title: '自动拆分建议',
    description: 'AI 检测到认证模块最近提交量上升，建议自动生成 3 条重构任务并分配到本周迭代。',
    primaryAction: 'Review Tasks',
    secondaryAction: 'Dismiss',
  },
  {
    id: 'risk-warning',
    type: 'warning',
    title: '交付风险预警',
    description: 'Nebula Cloud 最近 7 天速度下降 12%，按当前趋势里程碑可能延后 3 天。',
    primaryAction: 'Adjust Schedule',
    secondaryAction: 'Root Cause',
  },
];

function getProjectHealthClass(score: number) {
  if (score >= 80) return 'bg-accent-green';
  if (score >= 60) return 'bg-accent-yellow';
  return 'bg-accent-red';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const { data: projectsData, isLoading } = useProjectList({
    filters: { status: ['active'] },
    pageSize: 100,
  });
  const projects = projectsData?.data ?? [];

  const userName = currentUser?.displayName || currentUser?.username || 'User';
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const totalHealth = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + (project.healthScore ?? 75), 0) / projects.length,
      )
    : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-content-bg p-8">
        <div className="flex flex-col items-center gap-3 text-content-text-secondary">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-content-border border-t-accent-blue" />
          <span className="text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <PageShell aiPage={CORE_AI_PAGE_IDS.dashboardOverview} className="overflow-auto">
      <PageHeader
        aiId="project.dashboard-overview"
        title={`${greeting}, ${userName}`}
        description="统一查看项目健康度、风险提醒与 AI 建议，保持一个页面一个主题的决策节奏。"
        actions={(
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/projects')}
              data-ai-component="project.dashboard-overview.header.open-projects"
              data-ai-action="project.dashboard-overview.header.open-projects.jump"
              data-ai-role="jump"
            >
              Open Projects
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/app/ai')}
              data-ai-component="project.dashboard-overview.header.open-ai-space"
              data-ai-action="project.dashboard-overview.header.open-ai-space.jump"
              data-ai-role="jump"
            >
              Open AI Space
            </Button>
          </>
        )}
      />

      <div className="mx-auto grid w-full max-w-[1280px] gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <section
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
            data-ai-component="project.dashboard-overview.context-bar"
            data-ai-role="filter"
          >
            <Card className="border-content-border bg-content-bg motion-enter">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-content-text-secondary">System Health</p>
                  <p className="mt-1 text-2xl font-semibold text-content-text">99.9%</p>
                </div>
                <div className="rounded-full bg-accent-green-light p-2 text-accent-green">
                  <CheckCircle size={18} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-content-border bg-content-bg motion-enter">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-content-text-secondary">Delivery Velocity</p>
                  <p className="mt-1 text-2xl font-semibold text-content-text">84 pts/wk</p>
                </div>
                <div className="rounded-full bg-accent-blue-light p-2 text-accent-blue">
                  <Zap size={18} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-content-border bg-content-bg motion-enter">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-content-text-secondary">Active Projects</p>
                  <p className="mt-1 text-2xl font-semibold text-content-text">{projects.length}</p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  Health {totalHealth}%
                </Badge>
              </CardContent>
            </Card>
          </section>

          <Card
            className="border-content-border bg-content-bg"
            data-ai-component="project.dashboard-overview.primary-content.project-overview"
            data-ai-role="content"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Active Projects Overview</CardTitle>
              <Link
                to="/app/projects"
                className="inline-flex items-center gap-1 text-xs font-medium text-accent-blue no-underline hover:underline"
                data-ai-component="project.dashboard-overview.project-overview.view-all"
                data-ai-action="project.dashboard-overview.project-overview.view-all.jump"
                data-ai-role="jump"
              >
                View All <ChevronRight size={14} />
              </Link>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-content-border bg-content-bg-secondary text-content-text-secondary">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Project</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Health</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length > 0 ? (
                    projects.slice(0, 6).map((project) => {
                      const health = project.healthScore ?? 75;
                      return (
                        <tr key={project.id} className="border-b border-content-border">
                          <td className="px-4 py-3 font-medium text-content-text">{project.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-content-bg-secondary">
                                <div className={`h-full ${getProjectHealthClass(health)}`} style={{ width: `${health}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-content-text">{health}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="rounded-full capitalize">
                              {project.status || 'active'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/app/projects/${project.id}`)}
                              data-ai-component={`project.dashboard-overview.project-overview.open.${project.id}`}
                              data-ai-action={`project.dashboard-overview.project-overview.open.${project.id}.jump`}
                              data-ai-role="jump"
                            >
                              Open
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-content-text-secondary">
                        No active projects found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card
            className="border-content-border bg-content-bg"
            data-ai-component="project.dashboard-overview.primary-content.ai-insights"
            data-ai-role="content"
          >
            <CardHeader>
              <CardTitle className="text-sm">AI Insights & Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {AI_INSIGHTS.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-content-border bg-content-bg-secondary/40 p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-md p-2 ${
                        insight.type === 'suggestion'
                          ? 'bg-accent-blue-light text-accent-blue'
                          : 'bg-accent-red-light text-accent-red'
                      }`}
                    >
                      {insight.type === 'suggestion' ? <Lightbulb size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div className="flex-1">
                      <p className="m-0 text-sm font-semibold text-content-text">{insight.title}</p>
                      <p className="mt-1 text-xs leading-5 text-content-text-secondary">{insight.description}</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          data-ai-component={`project.dashboard-overview.ai-insights.${insight.id}.primary`}
                          data-ai-action={`project.dashboard-overview.ai-insights.${insight.id}.primary.click`}
                          data-ai-role="submit"
                        >
                          {insight.primaryAction}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          data-ai-component={`project.dashboard-overview.ai-insights.${insight.id}.secondary`}
                          data-ai-action={`project.dashboard-overview.ai-insights.${insight.id}.secondary.click`}
                          data-ai-role="jump"
                        >
                          {insight.secondaryAction}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-content-border bg-content-bg" data-ai-component="project.dashboard-overview.side-assist.activity" data-ai-role="panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Activity Feed</CardTitle>
              <Activity size={15} className="text-content-text-tertiary" />
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-content-text-secondary">
              <div className="rounded-md border border-content-border p-2">
                Alex Rivera committed to <span className="font-medium text-accent-blue">nebula-main</span>
              </div>
              <div className="rounded-md border border-content-border p-2">
                CI/CD deployment succeeded for <span className="font-medium text-content-text">Quantum Toolkit</span>
              </div>
              <div className="rounded-md border border-content-border p-2">
                AI Assistant generated the weekly productivity report
              </div>
            </CardContent>
          </Card>

          <AttentionRail
            aiPrefix="project.dashboard-overview"
            items={[
              {
                id: 'project-list',
                title: '切换到项目视图',
                description: '快速筛选项目、切换列表/看板/甘特',
                to: '/app/projects',
              },
              {
                id: 'task-workspace',
                title: '打开任务工作台',
                description: '查看执行状态并处理阻塞任务',
                to: '/app/projects/dashboard',
              },
              {
                id: 'settings',
                title: '进入全局设置',
                description: '调整主题、Git 与终端默认策略',
                to: '/app/settings',
              },
            ]}
          />
        </div>
      </div>
    </PageShell>
  );
}
