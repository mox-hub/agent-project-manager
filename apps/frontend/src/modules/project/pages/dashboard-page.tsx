/**
 * DashboardPage - 全局仪表盘
 *
 * 数据层走真实契约 GET /dashboard/overview（见 docs/design/api-contract-proposals.md §4），
 * 后端实装前由 msw 演示（?mock_scenario 可评审三态）。页面仅做装配：
 * KPI 卡 + 趋势面板 + 快捷操作 + 七个 drill-down 弹窗，数据全部来自单端点。
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Bot, DollarSign, Bug, CheckSquare, Activity, AlertTriangle,
  Sparkles, GitBranch, Shield,
  LayoutDashboard,
} from 'lucide-react';
import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AsyncState } from '@/components/semantic/async-state';
import { StatusPill } from '@/components/semantic/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/semantic/stat-tile';
import { StatsCard } from '@/components/semantic/stats-card';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useTranslation } from '@/hooks/useTranslation';
import { useDashboardOverview } from '../hooks/use-dashboard-overview';
import { GlobalOverviewPanels } from '../components/dashboard/global-overview-charts';
import type { DashboardOverview, DashboardHealthStatus, DashboardRiskSeverity } from '../api/dashboard-api';

// 成本卡不再有本地弹窗：点击直接跳 analytics 成本 Tab（验收归因明细在那里，CAP-C-06）
type DialogType = 'team' | 'ai' | 'bugs' | 'tasks' | 'health' | 'risks' | null;

const HEALTH_TONE: Record<DashboardHealthStatus, 'success' | 'warning' | 'danger'> = {
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'danger',
};

const RISK_SEVERITY_TONE: Record<DashboardRiskSeverity, 'danger' | 'warning' | 'default'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'default',
};

// ─── KPI 卡（点击下钻）：semantic/stats-card featured 变种（2026-09-29 统计卡归一批，
//     本地 KpiCard 退役；hover 抬升环改 hover 背景反馈，ArrowUpRight 角标不保留）───────

// ─── 弹窗内的统计块：semantic/stat-tile（2026-09-29 等价迁移，形态 class 全等拷贝；
//     原本地 StatTile 的 value 着色 className 改由调用方包 span 注入）────────────────

// ─── Drill-down 弹窗 ─────────────────────────────────────────────────────────
function TeamDialog({ data, open, onClose }: { data: DashboardOverview['team']; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-dialog-scroll overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4" />
            {t('dashboard.dialog.team')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label={t('dashboard.team.total')} value={data.totalMembers} />
            <StatTile label={t('dashboard.team.activeTasks')} value={data.activeTasks} />
            <StatTile label={t('dashboard.team.avgLoad')} value={`${data.avgLoadPct}%`} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.team.activity')}</p>
            {data.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium">{member.activeTasks} {t('dashboard.team.active')}</p>
                  <p className="text-xs text-muted-foreground">{member.completedThisWeek} {t('dashboard.team.done')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AIDialog({ data, open, onClose }: { data: DashboardOverview['ai']; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-dialog-scroll overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-4" />
            {t('dashboard.dialog.ai')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label={t('dashboard.ai.conversations')} value={<span className="text-accent-purple">{data.conversations}</span>} />
            <StatTile label={t('dashboard.ai.tokens')} value={<span className="text-accent-purple">{`${Math.round(data.tokensUsed / 1000)}K`}</span>} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.ai.topActivities')}</p>
            {data.topActivities.map((item) => (
              <div key={item.activity} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.activity}</span>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BugsDialog({ data, open, onClose }: { data: DashboardOverview['delivery']; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-dialog-scroll overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="size-4" />
            {t('dashboard.dialog.bugs')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-2">
          <StatTile label={t('dashboard.bugs.critical')} value={<span className="text-destructive">{data.criticalBugs}</span>} />
          <StatTile label={t('dashboard.bugs.open')} value={<span className="text-accent-blue">{data.openBugs}</span>} />
          <StatTile label={t('dashboard.bugs.resolved')} value={<span className="text-accent-green">{data.resolvedBugs}</span>} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TasksDialog({ data, open, onClose }: { data: DashboardOverview['delivery']; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-dialog-scroll overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="size-4" />
            {t('dashboard.dialog.tasks')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label={t('dashboard.tasks.active')} value={data.activeTasks} />
            <StatTile label={t('dashboard.tasks.total')} value={data.totalTasks} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.tasks.byPriority')}</p>
            {data.byPriority.map((item) => (
              <div key={item.priority} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{item.priority}</span>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HealthDialog({ data, open, onClose }: { data: DashboardOverview['health']; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-dialog-scroll overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            {t('dashboard.dialog.health')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label={t('dashboard.health.healthy')} value={<span className="text-accent-green">{data.projects.filter((p) => p.status === 'on_track').length}</span>} />
            <StatTile label={t('dashboard.health.atRisk')} value={<span className="text-accent-yellow">{data.projects.filter((p) => p.status === 'at_risk').length}</span>} />
            <StatTile label={t('dashboard.health.critical')} value={<span className="text-destructive">{data.projects.filter((p) => p.status === 'off_track').length}</span>} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.health.projects')}</p>
            {data.projects.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    {p.name}
                    <StatusPill tone={HEALTH_TONE[p.status]}>{p.score}</StatusPill>
                  </span>
                  <span className="text-xs text-muted-foreground">{p.score}/100</span>
                </div>
                <Progress value={p.score} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RisksDialog({ data, open, onClose }: { data: DashboardOverview['risks']; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-dialog-scroll overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            {t('dashboard.dialog.risks')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-3">
            {data.items.map((risk) => (
              <div key={risk.id} className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium flex-1">{risk.title}</p>
                  <StatusPill tone={RISK_SEVERITY_TONE[risk.severity]} className="ml-2 capitalize">{risk.severity}</StatusPill>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="size-3 shrink-0 mt-0.5 opacity-70" />
                    <p><span className="font-medium">{t('dashboard.risks.impact')}</span> {risk.impact}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Shield className="size-3 shrink-0 mt-0.5 opacity-70" />
                    <p><span className="font-medium">{t('dashboard.risks.mitigation')}</span> {risk.mitigation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium mb-1.5">{t('dashboard.risks.status')}</p>
            <Progress value={data.mitigationRatePct} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {t('dashboard.risks.statusDesc', { rate: data.mitigationRatePct })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const { data, isLoading, error, refetch } = useDashboardOverview();

  return (
    <PageShell
      className="overflow-hidden"
      aiPage={CORE_AI_PAGE_IDS.dashboardOverview}
      title={t('dashboard.title')}
      favorites={<FavoriteToggle label={nodeToText(t('dashboard.title')).trim()} />}
      icon={LayoutDashboard}
      iconColor="text-accent-blue"
    >
      <AsyncState
        isLoading={isLoading}
        error={error instanceof Error ? error.message : error ? String(error) : null}
        onRetry={() => refetch()}
        loadingFallback={
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-6 py-5 sm:px-8 sm:py-6 lg:px-10 space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                <Skeleton className="h-56 rounded-xl" />
                <Skeleton className="h-56 rounded-xl" />
              </div>
            </div>
          </div>
        }
      >
        {data && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-6 py-5 sm:px-8 sm:py-6 lg:px-10 space-y-4">
              {/* KPI Cards - 两排聚合在一个紧凑模块内，行距紧缩为 space-y-3 */}
              <div className="space-y-3">
                {/* KPI Cards - Row 1 */}
                <StatsCard
                  layout="featured"
                  columns={4}
                  items={[
                    {
                      key: 'team',
                      label: t('dashboard.kpis.team'),
                      value: data.team.totalMembers,
                      hint: t('dashboard.kpis.teamSub'),
                      icon: Users,
                      tone: 'blue',
                      onClick: () => setOpenDialog('team'),
                    },
                    {
                      key: 'ai',
                      label: t('dashboard.kpis.ai'),
                      value: data.ai.conversations,
                      hint: t('dashboard.kpis.aiSub', { count: data.ai.weeklyGrowth }),
                      icon: Bot,
                      tone: 'purple',
                      onClick: () => setOpenDialog('ai'),
                    },
                    {
                      key: 'cost',
                      label: t('dashboard.kpis.cost'),
                      value: `$${data.cost.monthTotal.toLocaleString()}`,
                      // 预算基线未配置（null）：诚实显示「预算基线未设置」，不再显示虚假的 0%
                      hint: data.cost.budgetDeltaPct == null
                        ? t('dashboard.kpis.costNotSet')
                        : t('dashboard.kpis.costSub', { pct: Math.abs(data.cost.budgetDeltaPct) }),
                      icon: DollarSign,
                      tone: 'green',
                      // 下钻直达 analytics 成本 Tab（既有 ?tab=cost 路由），成本弹窗已退役
                      onClick: () => navigate('/app/analytics?tab=cost'),
                    },
                    {
                      key: 'bugs',
                      label: t('dashboard.kpis.bugs'),
                      value: data.delivery.criticalBugs,
                      hint: t('dashboard.kpis.bugsSub', { count: data.delivery.openBugs }),
                      icon: Bug,
                      tone: 'red',
                      onClick: () => setOpenDialog('bugs'),
                    },
                  ]}
                />

                {/* KPI Cards - Row 2 */}
                <StatsCard
                  layout="featured"
                  columns={3}
                  items={[
                    {
                      key: 'tasks',
                      label: t('dashboard.kpis.tasks'),
                      value: data.delivery.activeTasks,
                      hint: t('dashboard.kpis.tasksSub', { count: data.delivery.totalTasks }),
                      icon: CheckSquare,
                      tone: 'blue',
                      onClick: () => setOpenDialog('tasks'),
                    },
                    {
                      key: 'health',
                      label: t('dashboard.kpis.health'),
                      value: data.health.avgScore,
                      hint: t('dashboard.kpis.healthSub'),
                      icon: Activity,
                      tone: 'green',
                      onClick: () => setOpenDialog('health'),
                    },
                    {
                      key: 'risks',
                      label: t('dashboard.kpis.risks'),
                      value: data.risks.items.length,
                      hint: t('dashboard.kpis.risksSub'),
                      icon: AlertTriangle,
                      tone: 'yellow',
                      onClick: () => setOpenDialog('risks'),
                    },
                  ]}
                />
              </div>

              {/* Trends Rows 3-4：四张趋势面板统一走 ChartCard + ChartContainer 正式图表栈
                  （2026-09-30 图表栈升级批，手搓 div 条/柱退役） */}
              <GlobalOverviewPanels trends={data.trends} costByCategory={data.cost.byCategory} />

              {/* Quick Actions */}
              <Card className="py-0">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2.5">{t('dashboard.actions.title')}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button variant="outline" className="h-auto py-2.5 flex-col gap-1.5" onClick={() => navigate('/app/issues')}>
                      <CheckSquare className="size-4.5" />
                      <span className="text-xs">{t('dashboard.actions.tasks')}</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-2.5 flex-col gap-1.5" onClick={() => navigate('/app/bugs')}>
                      <Bug className="size-4.5" />
                      <span className="text-xs">{t('dashboard.actions.bugs')}</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-2.5 flex-col gap-1.5" onClick={() => navigate('/app/settings/ai')}>
                      <Sparkles className="size-4.5" />
                      <span className="text-xs">{t('dashboard.actions.aiHub')}</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-2.5 flex-col gap-1.5" onClick={() => navigate('/app/repositories')}>
                      <GitBranch className="size-4.5" />
                      <span className="text-xs">{t('dashboard.actions.repos')}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </AsyncState>

      {/* Drill-down 弹窗（数据全部来自 overview 端点，不二次请求） */}
      {data && (
        <>
          <TeamDialog data={data.team} open={openDialog === 'team'} onClose={() => setOpenDialog(null)} />
          <AIDialog data={data.ai} open={openDialog === 'ai'} onClose={() => setOpenDialog(null)} />
          <BugsDialog data={data.delivery} open={openDialog === 'bugs'} onClose={() => setOpenDialog(null)} />
          <TasksDialog data={data.delivery} open={openDialog === 'tasks'} onClose={() => setOpenDialog(null)} />
          <HealthDialog data={data.health} open={openDialog === 'health'} onClose={() => setOpenDialog(null)} />
          <RisksDialog data={data.risks} open={openDialog === 'risks'} onClose={() => setOpenDialog(null)} />
        </>
      )}
    </PageShell>
  );
}
