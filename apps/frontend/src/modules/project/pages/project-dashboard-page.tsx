import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  ChevronRight,
  Clock,
  Copy,
  Plus,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateTask } from '@/modules/task/hooks/use-project-tasks';
import { useRefreshAIContext } from '../hooks/use-project-health';
import {
  selectProjectAnalytics,
  selectProjectHealthDetails,
  useProjectDashboardSummary,
} from '../hooks/use-project-dashboard-summary';
import { IntegrationStatusStrip } from '../components/dashboard/integration-status-strip';
import {
  ProjectAnalyticsPanel,
  type AnalyticsModulesState,
} from '../components/dashboard/project-analytics-panel';
import { ProjectHealthScoreDialog } from '../components/dashboard/project-health-score-dialog';
import { toast } from '@/hooks/use-toast';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';

/* ── Mock chart data (Figma baseline) ───────────────────────────────── */

const burndownData = [
  { day: 'Mar 1', remaining: 48, ideal: 48 },
  { day: 'Mar 4', remaining: 44, ideal: 42 },
  { day: 'Mar 7', remaining: 38, ideal: 35 },
  { day: 'Mar 10', remaining: 31, ideal: 28 },
  { day: 'Mar 13', remaining: 27, ideal: 21 },
  { day: 'Mar 16', remaining: 22, ideal: 14 },
  { day: 'Mar 19', remaining: 18, ideal: 8 },
];

const velocityData = [
  { sprint: 'S1', completed: 18, planned: 20 },
  { sprint: 'S2', completed: 22, planned: 22 },
  { sprint: 'S3', completed: 19, planned: 24 },
  { sprint: 'S4', completed: 14, planned: 20 },
];

const taskDistributionData = [
  { name: 'Done', value: 84, color: '#10b981' },
  { name: 'In Progress', value: 18, color: '#3b82f6' },
  { name: 'In Review', value: 8, color: '#f59e0b' },
  { name: 'Todo', value: 14, color: '#6b7280' },
];

/* ── Stat Card (Figma style with icon + trend) ──────────────────────── */

function DashboardStatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendValue,
  color,
  onClick,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn('relative overflow-hidden', onClick && 'cursor-pointer hover:ring-2 hover:ring-ring/30 transition-all')}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {trend && trendValue && (
          <div className={cn(
            'mt-2 flex items-center gap-1 text-[11px] font-medium',
            trend === 'up' ? 'text-emerald-600' : 'text-red-500',
          )}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Constants ──────────────────────────────────────────────────────── */

const DEFAULT_ANALYTICS_MODULES: AnalyticsModulesState = {
  delivery: true,
  aiRisk: true,
  workload: true,
};

function getStorageKey(projectId: string) {
  return `project-dashboard-modules:${projectId}`;
}

function readAnalyticsModulesFromStorage(projectId: string | undefined): AnalyticsModulesState {
  if (!projectId) return DEFAULT_ANALYTICS_MODULES;
  const raw = localStorage.getItem(getStorageKey(projectId));
  if (!raw) return DEFAULT_ANALYTICS_MODULES;
  try {
    const parsed = JSON.parse(raw) as Partial<AnalyticsModulesState>;
    return {
      delivery: parsed.delivery ?? true,
      aiRisk: parsed.aiRisk ?? true,
      workload: parsed.workload ?? true,
    };
  } catch {
    return DEFAULT_ANALYTICS_MODULES;
  }
}

/* ── Main Component ─────────────────────────────────────────────────── */

export function ProjectDashboardPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading, isError, error } = useProjectDashboardSummary(projectId);
  const createTask = useCreateTask();
  const refreshAI = useRefreshAIContext(projectId || '');
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showHealthDialog, setShowHealthDialog] = useState(false);
  const [analyticsModulesByProject, setAnalyticsModulesByProject] = useState<
    Record<string, AnalyticsModulesState>
  >({});

  const project = summary?.projectMeta;
  const taskStats = summary?.taskStats;
  const healthDetails = selectProjectHealthDetails(summary);
  const analytics = selectProjectAnalytics(summary);

  const analyticsModules = projectId
    ? analyticsModulesByProject[projectId] ?? readAnalyticsModulesFromStorage(projectId)
    : DEFAULT_ANALYTICS_MODULES;

  const handleAnalyticsModulesChange = (value: AnalyticsModulesState) => {
    if (projectId) {
      setAnalyticsModulesByProject((previous) => ({ ...previous, [projectId]: value }));
      localStorage.setItem(getStorageKey(projectId), JSON.stringify(value));
    }
  };

  const dateRange =
    !project?.startDate && !project?.targetDate
      ? 'No schedule'
      : `${project?.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'} - ${project?.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'N/A'}`;

  const handleCreateTask = async (title: string) => {
    if (!projectId || !title.trim()) return;
    await createTask.mutateAsync({ projectId, title: title.trim(), status: 'todo' });
    setShowCreateInline(false);
    setNewTaskTitle('');
    toast({ title: 'Task created', description: '新任务已创建并加入看板。' });
  };

  const handleCopyLink = async () => {
    if (!projectId) return;
    await navigator.clipboard.writeText(`${window.location.origin}/app/projects/${projectId}`);
    toast({ title: 'Link copied', description: '项目链接已复制到剪贴板。' });
  };

  const handleShareHealth = async () => {
    await handleCopyLink();
    toast({ title: 'Score link copied', description: '评分详情链接已复制。' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        Loading project dashboard...
      </div>
    );
  }

  if (isError || !summary || !project || !taskStats) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-background p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-red-light">
          <AlertCircle size={32} className="text-accent-red" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-accent-red">Failed to load project</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Project summary is unavailable.'}
        </p>
        <Link
          to="/app/projects"
          className="inline-block rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground no-underline hover:bg-muted/50"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <>
      <ProjectDetailFrame
        aiPage={CORE_AI_PAGE_IDS.projectDashboard}
        projectId={projectId || ''}
        projectName={project.name}
        title="Overview"
        description={project.description || 'No description.'}
        topActions={(
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => navigate('/app/ai')}
            data-ai-component="project.project-dashboard.top.ask-ai"
            data-ai-role="jump"
          >
            <Sparkles size={12} />
            Ask AI
          </Button>
        )}
        trackingScore={summary.health.currentScore}
        trackingLabel={
          summary.health.currentScore >= 80
            ? 'On Track'
            : summary.health.currentScore >= 60
              ? 'At Risk'
              : 'Off Track'
        }
        actions={(
          <>
            <Badge variant="secondary">{project.type}</Badge>
            <Badge variant="outline" className="capitalize">
              {project.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/projects/${projectId}/settings`)}>
              <Settings size={14} />
              Edit Project
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy size={14} />
              Share
            </Button>
            <Button
              size="sm"
              className="bg-accent-blue text-white hover:bg-accent-blue/90"
              onClick={() => setShowCreateInline(true)}
              data-ai-component="project.project-dashboard.header.new-task"
              data-ai-action="project.project-dashboard.header.new-task.click"
              data-ai-role="submit"
            >
              <Plus size={14} />
              Add Task
            </Button>
          </>
        )}
      >
        <p className="mb-4 text-xs text-muted-foreground">{dateRange}</p>

        {showCreateInline ? (
          <section
            className="mb-4 rounded-[var(--radius)] border border-border bg-muted/50 p-4 motion-enter"
            data-ai-component="project.project-dashboard.inline-create"
            data-ai-role="panel"
          >
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleCreateTask(newTaskTitle);
              }}
            >
              <Input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Task title"
                autoFocus
                className="h-9 min-w-[260px] flex-1 bg-background"
                data-ai-component="project.project-dashboard.inline-create.title-input"
                data-ai-action="project.project-dashboard.inline-create.title-input.change"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateInline(false);
                  setNewTaskTitle('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || !newTaskTitle.trim()}
                data-ai-component="project.project-dashboard.inline-create.submit"
                data-ai-action="project.project-dashboard.inline-create.submit.click"
                data-ai-role="submit"
              >
                {createTask.isPending ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </section>
        ) : null}

        {/* ── Stats Row (4 cards with icons + trends) ────────────────── */}
        <section className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4" data-ai-component="stat-cards">
          <DashboardStatCard
            title="Tasks Completed"
            value={taskStats.done}
            sub={`of ${taskStats.total} total`}
            icon={CheckSquare}
            trend="up"
            trendValue="+8 this week"
            color="bg-emerald-500"
          />
          <DashboardStatCard
            title="Project Health"
            value={summary.health.currentScore}
            sub={summary.health.currentScore >= 80 ? 'On Track' : summary.health.currentScore >= 60 ? 'At Risk' : 'Off Track'}
            icon={Activity}
            trend={summary.health.trend30d >= 0 ? 'up' : 'down'}
            trendValue={`${summary.health.trend30d >= 0 ? '+' : ''}${summary.health.trend30d} pts`}
            color="bg-blue-500"
            onClick={() => setShowHealthDialog(true)}
          />
          <DashboardStatCard
            title="Team Velocity"
            value={`${taskStats.inProgress + taskStats.inReview}`}
            sub={`${taskStats.inProgress} active · ${taskStats.inReview} in review`}
            icon={Zap}
            color="bg-amber-500"
          />
          <DashboardStatCard
            title="Overdue Tasks"
            value={taskStats.overdue}
            sub={taskStats.overdue > 0 ? 'requires attention' : 'all on track'}
            icon={Clock}
            trend={taskStats.overdue > 0 ? 'down' : undefined}
            trendValue={taskStats.overdue > 0 ? `${taskStats.overdue} overdue` : undefined}
            color="bg-red-500"
            onClick={() => navigate(`/app/projects/${projectId}/board`)}
          />
        </section>

        {/* ── Charts Row (Burndown + Task Distribution) ──────────────── */}
        <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                Sprint Burndown
                <span className="text-xs font-normal text-muted-foreground">Last 7 days</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={burndownData}>
                  <defs>
                    <linearGradient id="remainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                  <Area type="monotone" dataKey="ideal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="Ideal" />
                  <Area type="monotone" dataKey="remaining" stroke="#3b82f6" strokeWidth={2} fill="url(#remainGrad)" name="Remaining" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm font-medium">Task Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={taskDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {taskDistributionData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 space-y-1.5">
                {taskDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Bottom Row (Velocity + Recent Activity + AI Insights) ──── */}
        <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm font-medium">Sprint Velocity</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="sprint" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                  <Bar dataKey="planned" fill="#e2e8f0" radius={[3, 3, 0, 0]} name="Planned" />
                  <Bar dataKey="completed" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground"
                onClick={() => navigate(`/app/projects/${projectId}/board`)}
              >
                View all
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              {summary.activityFeed.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent activity.</p>
              ) : (
                summary.activityFeed.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="min-w-0">
                    <p className="truncate text-[11px] text-foreground">{activity.summary}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()} · {activity.source}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* AI Insights — violet theme */}
          <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-violet-500" />
                AI Insights
                <Badge className="ml-auto border-violet-200 bg-violet-100 px-1.5 py-0 text-[10px] text-violet-700 dark:border-violet-800 dark:bg-violet-900/50 dark:text-violet-400">
                  AI
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              {summary.ai.summary ? (
                <>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <p className="text-[11px] text-foreground">
                      {taskStats.overdue > 0
                        ? `${taskStats.overdue} task(s) overdue — consider reassigning`
                        : 'All tasks on track'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <p className="text-[11px] text-foreground">
                      Health score {summary.health.trend30d >= 0 ? 'up' : 'down'}{' '}
                      {Math.abs(summary.health.trend30d)}pts this week
                    </p>
                  </div>
                  <p className="pt-1 text-[11px] italic text-muted-foreground">
                    "{summary.ai.summary.slice(0, 80)}{summary.ai.summary.length > 80 ? '...' : ''}"
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">No AI insights yet.</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-7 w-full text-xs"
                onClick={() => navigate('/app/ai')}
              >
                <Sparkles className="mr-1.5 h-3 w-3" />
                View full analysis
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* ── Team Workload (compact) ────────────────────────────────── */}
        <section className="mb-5">
          <Card>
            <CardHeader className="flex items-center justify-between px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Team Workload
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground"
                onClick={() => navigate(`/app/projects/${projectId}/team`)}
              >
                View team <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {summary.teamWorkload.length === 0 ? (
                <p className="text-xs text-muted-foreground">No team data.</p>
              ) : (
                <div className="space-y-3">
                  {summary.teamWorkload.slice(0, 5).map((member) => (
                    <div key={member.memberId} className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-[10px]">
                          {member.memberName.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{member.memberName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {member.taskCount} tasks · {member.percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              member.percentage >= 60 ? 'bg-red-500' : member.percentage >= 40 ? 'bg-amber-500' : 'bg-emerald-500',
                            )}
                            style={{ width: `${member.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Integration Status ─────────────────────────────────────── */}
        <section className="mb-5">
          <IntegrationStatusStrip
            repositoryCount={summary.integrations.repositories.length}
            externalLinksCount={summary.integrations.externalLinksCount}
            docLinksCount={summary.integrations.docLinksCount}
            apiDocLinksCount={summary.integrations.apiDocLinksCount}
            onManage={() => navigate(`/app/projects/${projectId}/settings`)}
          />
        </section>

        {/* ── Analytics Panel ────────────────────────────────────────── */}
        <section className="mb-5">
          <ProjectAnalyticsPanel
            analytics={analytics}
            modules={analyticsModules}
            onModulesChange={handleAnalyticsModulesChange}
          />
        </section>
      </ProjectDetailFrame>
      <ProjectHealthScoreDialog
        open={showHealthDialog}
        onOpenChange={setShowHealthDialog}
        score={summary.health.currentScore}
        trend30d={summary.health.trend30d}
        details={healthDetails}
        lastEvaluatedAt={summary.health.lastEvaluatedAt}
        onRefresh={() => refreshAI.mutate()}
        onShare={handleShareHealth}
      />
    </>
  );
}
