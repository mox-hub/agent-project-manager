/**
 * analytics-page.tsx - 全局分析页面
 *
 * 还原参考: refers/APM/src/app/pages/AnalyticsPage.tsx（5-Tab 结构）
 * 原则:
 * - Overview Tab 使用真实 API（useAnalyticsOverview），不影响数据
 * - Cost / Quality / Risk / Team Activity 四个 Tab 暂无真实数据源，
 *   采用 refer 的静态示例数据并标记 data-mock="true"（仅展示形态）
 */
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, DollarSign, Activity, ShieldAlert, Users, Zap, AlertTriangle, XCircle, TrendingUp, TrendingDown, Target, Minus, CheckCircle2 } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useAnalyticsOverview } from '../hooks/use-analytics-overview';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, RadarChart, Radar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <ArrowUp size={14} className="text-accent-green" />;
  if (trend === 'down') return <ArrowDown size={14} className="text-accent-red" />;
  return <ArrowRight size={14} className="text-muted-foreground" />;
}

// ⚠️ MOCK DATA（Cost/Quality/Risk/Team 四 Tab 展示用，无真实数据源）───────────────
const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' };

const teamActivityData = [
  { week: 'W08', tasks: 42, commits: 118, prs: 24 },
  { week: 'W09', tasks: 48, commits: 132, prs: 29 },
  { week: 'W10', tasks: 45, commits: 121, prs: 27 },
  { week: 'W11', tasks: 55, commits: 148, prs: 33 },
];

const costTrendData = [
  { month: 'Mar', budget: 300, cost: 215 },
  { month: 'Apr', budget: 300, cost: 238 },
  { month: 'May', budget: 300, cost: 252 },
  { month: 'Jun', budget: 320, cost: 268 },
  { month: 'Jul', budget: 320, cost: 291 },
  { month: 'Aug', budget: 320, cost: 187 },
];

const costByProjectData = [
  { name: 'AgentPM Platform', cost: 52, acceptanceCost: 18 },
  { name: 'Payment Integration', cost: 41, acceptanceCost: 22 },
  { name: 'AI Code Reviewer', cost: 28, acceptanceCost: 9 },
  { name: 'Data Pipeline v2', cost: 22, acceptanceCost: 11 },
];

const costByModelData = [
  { name: 'claude-code', value: 86, color: '#7c3aed' },
  { name: 'cursor', value: 42, color: '#3b82f6' },
  { name: 'codex', value: 34, color: '#10b981' },
  { name: 'copilot', value: 25, color: '#f59e0b' },
];

const qualityTrendData = [
  { week: 'W08', patchPct: 52, refactorPct: 18, complexity: 42 },
  { week: 'W09', patchPct: 46, refactorPct: 22, complexity: 40 },
  { week: 'W10', patchPct: 40, refactorPct: 26, complexity: 36 },
  { week: 'W11', patchPct: 30, refactorPct: 32, complexity: 28 },
];

const qualityByProject = [
  { name: 'AgentPM Platform', score: 86, testCoverage: 72 },
  { name: 'Payment Integration', score: 74, testCoverage: 58 },
  { name: 'AI Code Reviewer', score: 92, testCoverage: 81 },
];

const riskItems = [
  { id: 'r1', title: 'Webhook 事件幂等性缺陷', projectName: 'Payment Integration', type: 'acceptance', risk: 88, trend: 'up' as const },
  { id: 'r2', title: '3D Secure 仅欧区支持', projectName: 'Payment Integration', type: 'quality', risk: 72, trend: 'up' as const },
  { id: 'r3', title: 'PCI-DSS 合规审计待启动', projectName: 'Payment Integration', type: 'delivery', risk: 65, trend: 'down' as const },
  { id: 'r4', title: 'AI 精度指标未达目标', projectName: 'AI Code Reviewer', type: 'quality', risk: 58, trend: 'down' as const },
  { id: 'r5', title: '数据迁移窗口冲突', projectName: 'Data Pipeline v2', type: 'delivery', risk: 44, trend: 'flat' as const },
];

const memberActivityData = [
  { name: 'Alex Chen', initials: 'AC', color: '#3b82f6', executions: 14, aiHoursUsed: 6.2, acceptancesOwned: 8 },
  { name: 'Sarah Kim', initials: 'SK', color: '#10b981', executions: 9, aiHoursUsed: 4.1, acceptancesOwned: 5 },
  { name: 'Marcus Lee', initials: 'ML', color: '#f59e0b', executions: 7, aiHoursUsed: 3.4, acceptancesOwned: 4 },
  { name: 'Lisa Wang', initials: 'LW', color: '#7c3aed', executions: 6, aiHoursUsed: 3.0, acceptancesOwned: 3 },
];

const activityTimelineData = [
  { time: '09:00', alex: 2, sarah: 1, marcus: 0, lisa: 1, james: 0 },
  { time: '10:00', alex: 3, sarah: 2, marcus: 1, lisa: 0, james: 1 },
  { time: '11:00', alex: 2, sarah: 1, marcus: 2, lisa: 1, james: 0 },
  { time: '13:00', alex: 1, sarah: 2, marcus: 0, lisa: 2, james: 1 },
  { time: '14:00', alex: 3, sarah: 1, marcus: 1, lisa: 1, james: 1 },
  { time: '15:00', alex: 2, sarah: 2, marcus: 2, lisa: 0, james: 0 },
];

const radarData = [
  { subject: 'Velocity', A: 85 },
  { subject: 'Quality', A: 90 },
  { subject: 'Collaboration', A: 78 },
  { subject: 'Innovation', A: 72 },
  { subject: 'Delivery', A: 88 },
  { subject: 'Learning', A: 75 },
];

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'text-foreground', trend }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <div className="flex items-end gap-1.5">
          <p className={cn('text-2xl font-semibold', color)}>{value}</p>
          {trend && <TrendIcon className={cn('w-3.5 h-3.5 mb-0.5', trendColor)} />}
        </div>
        <p className="text-11 text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Overview（真实 API）─────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading, isError } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonChart /><SkeletonChart />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[40vh] w-full max-w-md flex-col items-center justify-center p-8 text-center mx-auto">
        <Alert variant="destructive" className="text-left w-full">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法加载分析数据，请稍后重试。</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          <RefreshCwIcon className="size-3.5 mr-1.5" />重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="项目总数" value={data.totalProjects} sub="all projects" icon={Target} color="text-accent-blue" />
        <StatCard label="活跃 Agent" value={data.activeAgents} sub="agents working" icon={Zap} color="text-accent-purple" />
        <StatCard label="交付率" value={`${data.deliveryRate}%`} sub="delivery rate" icon={CheckCircle2} color="text-accent-green" />
        <StatCard label="质量评分" value={data.qualityScore} sub="quality score" icon={Activity} color="text-accent-yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">模块健康度</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
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
                    <TableCell><TrendArrow trend={module.trend} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">风险聚焦</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {data.risks.map((risk) => (
              <div key={risk.id} className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm font-medium text-foreground">{risk.project}</p>
                <p className="mt-1 text-xs text-muted-foreground">{risk.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">建议: {risk.action}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Cost（mock）───────────────────────────────────────────────────────────

function CostTab() {
  const totalCost = costTrendData.reduce((s, d) => s + d.cost, 0);
  const thisMonthCost = 187;
  const thisMonthBudget = 300;
  const roiAcceptances = 24;
  const costPerAcceptance = (totalCost / roiAcceptances).toFixed(1);

  return (
    <div className="space-y-5" data-mock="true">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Cost (6mo)" value={`$${totalCost}`} sub="AI execution spend" icon={DollarSign} color="text-violet-500" />
        <StatCard label="This Month" value={`$${thisMonthCost}`} sub={`${Math.round((thisMonthCost / thisMonthBudget) * 100)}% of budget`} icon={BarChart3} color="text-blue-500" />
        <StatCard label="Cost per Acceptance" value={`$${costPerAcceptance}`} sub={`${roiAcceptances} acceptances`} icon={Target} color="text-emerald-500" />
        <StatCard label="ROI Score" value="4.2×" sub="value vs. manual review" icon={TrendingUp} color="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Monthly Cost vs Budget</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={costTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="$" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="budget" stroke="#e2e8f0" fill="#f1f5f9" name="Budget" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="cost" stroke="#7c3aed" fill="rgba(124,58,237,0.15)" name="Cost" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Cost by Project</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {costByProjectData.map(p => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs truncate flex-1 mr-2">{p.name}</span>
                  <span className="text-xs font-medium shrink-0">${p.cost}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${(p.cost / 80) * 100}%`, maxWidth: '70%' }} />
                  <div className="h-1.5 rounded-full bg-violet-200 dark:bg-violet-900" style={{ width: `${(p.acceptanceCost / 80) * 100}%`, maxWidth: '30%' }} />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-1">
              <span className="flex items-center gap-1.5 text-10 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-violet-500" />Execution</span>
              <span className="flex items-center gap-1.5 text-10 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-violet-200 dark:bg-violet-900" />Acceptance</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Cost by Model</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={costByModelData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {costByModelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {costByModelData.map(m => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                  <span className="text-xs w-24">{m.name}</span>
                  <span className="text-xs font-medium">${m.value}</span>
                  <span className="text-10 text-muted-foreground">
                    {Math.round((m.value / costByModelData.reduce((s, x) => s + x.value, 0)) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Quality（mock）────────────────────────────────────────────────────────

function QualityTab() {
  return (
    <div className="space-y-5" data-mock="true">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Quality Score" value="80" sub="across all projects" icon={Activity} color="text-emerald-500" />
        <StatCard label="Refactor Ratio" value="32%" sub="of AI changes are refactors" icon={TrendingUp} color="text-blue-500" trend="down" />
        <StatCard label="Patch Ratio" value="30%" sub="down from 52% in W08" icon={Minus} color="text-amber-500" trend="down" />
        <StatCard label="Complexity Drift" value="-12" sub="avg complexity down (good)" icon={BarChart3} color="text-violet-500" trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Code Change Quality Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={qualityTrendData}>
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
            {qualityByProject.map(p => (
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
  const RISK_TYPE_CFG: Record<string, { label: string; color: string }> = {
    acceptance: { label: 'Acceptance', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    cost:       { label: 'Cost',       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    delivery:   { label: 'Delivery',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
    quality:    { label: 'Quality',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  };

  return (
    <div className="space-y-5" data-mock="true">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="High Risk Items" value={riskItems.filter(r => r.risk >= 80).length} sub="risk score ≥ 80" icon={ShieldAlert} color="text-red-600" />
        <StatCard label="Medium Risk" value={riskItems.filter(r => r.risk >= 50 && r.risk < 80).length} sub="risk score 50–79" icon={AlertTriangle} color="text-amber-600" />
        <StatCard label="Trending Up" value={riskItems.filter(r => r.trend === 'up').length} sub="worsening risks" icon={TrendingUp} color="text-red-500" trend="up" />
        <StatCard label="Improving" value={riskItems.filter(r => r.trend === 'down').length} sub="risk declining" icon={TrendingDown} color="text-emerald-500" trend="down" />
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Risk Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {riskItems.map(item => {
            const typeCfg = RISK_TYPE_CFG[item.type];
            const TrendIcon = item.trend === 'up' ? ArrowUp : item.trend === 'down' ? ArrowDown : Minus;
            const trendColor = item.trend === 'up' ? 'text-red-500' : item.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground';
            const riskColor = item.risk >= 80 ? 'text-red-600' : item.risk >= 50 ? 'text-amber-600' : 'text-emerald-600';
            return (
              <div key={item.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                item.risk >= 80 ? 'border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/10' :
                item.risk >= 50 ? 'border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10' :
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
  return (
    <div className="space-y-5" data-mock="true">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={4} sub="all contributed today" icon={Users} color="text-blue-500" />
        <StatCard label="AI Executions" value={36} sub="today across all agents" icon={Zap} color="text-violet-500" />
        <StatCard label="Conflicts Detected" value={2} sub="in agent work overlap" icon={AlertTriangle} color="text-amber-500" />
        <StatCard label="Stuck Tasks" value={3} sub="> 5 days, no progress" icon={XCircle} color="text-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">AI Activity by Member (Today)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityTimelineData} layout="horizontal">
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
            {memberActivityData.map(m => (
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

export function AnalyticsPage() {
  return (
    <PageShell className="overflow-auto" aiPage={CORE_AI_PAGE_IDS.analytics}>
      <div className="mx-auto w-full max-w-7xl p-6 space-y-6">
        <PageHeader
          aiId="analytics.overview"
          title="Analytics"
          icon={BarChart3}
          iconColor="text-accent-blue"
        />

        <Tabs defaultValue="overview">
          <TabsList className="mb-5 h-9">
            <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="cost" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" />Cost</TabsTrigger>
            <TabsTrigger value="quality" className="text-xs gap-1.5"><Activity className="w-3.5 h-3.5" />Quality</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs gap-1.5"><ShieldAlert className="w-3.5 h-3.5" />Risk</TabsTrigger>
            <TabsTrigger value="team" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" />Team Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="cost"><CostTab /></TabsContent>
          <TabsContent value="quality"><QualityTab /></TabsContent>
          <TabsContent value="risk"><RiskTab /></TabsContent>
          <TabsContent value="team"><TeamActivityTab /></TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
