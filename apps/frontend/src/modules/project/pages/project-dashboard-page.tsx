import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Copy, Plus, Settings } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useCreateTask } from '@/modules/task/hooks/use-project-tasks';
import { useRefreshAIContext } from '../hooks/use-project-health';
import {
  selectProjectAnalytics,
  selectProjectHealthDetails,
  useProjectDashboardSummary,
} from '../hooks/use-project-dashboard-summary';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';
import { HealthScoreCard } from '../components/dashboard/health-score-card';
import { AiInsightCard } from '../components/dashboard/ai-insight-card';
import { IntegrationStatusStrip } from '../components/dashboard/integration-status-strip';
import {
  ProjectAnalyticsPanel,
  type AnalyticsModulesState,
} from '../components/dashboard/project-analytics-panel';
import { ProjectHealthScoreDialog } from '../components/dashboard/project-health-score-dialog';
import { toast } from '@/hooks/use-toast';

const DEFAULT_ANALYTICS_MODULES: AnalyticsModulesState = {
  delivery: true,
  aiRisk: true,
  workload: true,
};

function getStorageKey(projectId: string) {
  return `project-dashboard-modules:${projectId}`;
}

export function ProjectDashboardPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading, isError, error } = useProjectDashboardSummary(projectId);
  const createTask = useCreateTask();
  const refreshAI = useRefreshAIContext(projectId || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHealthDialog, setShowHealthDialog] = useState(false);
  const [analyticsModules, setAnalyticsModules] = useState<AnalyticsModulesState>(
    DEFAULT_ANALYTICS_MODULES,
  );

  const project = summary?.projectMeta;
  const taskStats = summary?.taskStats;
  const healthDetails = selectProjectHealthDetails(summary);
  const analytics = selectProjectAnalytics(summary);

  useEffect(() => {
    if (!projectId) return;
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<AnalyticsModulesState>;
      setAnalyticsModules({
        delivery: parsed.delivery ?? true,
        aiRisk: parsed.aiRisk ?? true,
        workload: parsed.workload ?? true,
      });
    } catch {
      setAnalyticsModules(DEFAULT_ANALYTICS_MODULES);
    }
  }, [projectId]);

  const handleAnalyticsModulesChange = (value: AnalyticsModulesState) => {
    setAnalyticsModules(value);
    if (projectId) {
      localStorage.setItem(getStorageKey(projectId), JSON.stringify(value));
    }
  };

  const dateRange = useMemo(() => {
    if (!project?.startDate && !project?.targetDate) return 'No schedule';
    const start = project?.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A';
    const target = project?.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'N/A';
    return `${start} - ${target}`;
  }, [project?.startDate, project?.targetDate]);

  const handleCreateTask = async (title: string) => {
    if (!projectId || !title.trim()) return;
    await createTask.mutateAsync({ projectId, title: title.trim(), status: 'todo' });
    setShowCreateModal(false);
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
      <div className="flex min-h-screen items-center justify-center bg-content-bg p-8 text-sm text-content-text-secondary">
        Loading project dashboard...
      </div>
    );
  }

  if (isError || !summary || !project || !taskStats) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-content-bg p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-red-light">
          <AlertCircle size={32} className="text-accent-red" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-accent-red">Failed to load project</h2>
        <p className="mb-4 text-sm text-content-text-secondary">
          {error instanceof Error ? error.message : 'Project summary is unavailable.'}
        </p>
        <Link
          to="/app/projects"
          className="inline-block rounded-md border border-content-border bg-content-bg px-4 py-2 text-sm font-medium text-content-text no-underline hover:bg-content-bg-secondary"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <section className="mb-6 rounded-xl border border-content-border bg-content-bg-secondary p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-content-text">{project.name}</h1>
                <Badge variant="secondary">{project.type}</Badge>
                <Badge variant="outline" className="capitalize">
                  {project.status}
                </Badge>
              </div>
              <p className="text-sm text-content-text-secondary">{project.description || 'No description.'}</p>
              <div className="mt-2 text-xs text-content-text-tertiary">{dateRange}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate(`/app/projects/${projectId}/settings`)}>
                <Settings size={14} />
                Edit Project
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                <Copy size={14} />
                Share
              </Button>
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} />
                New Task
              </Button>
            </div>
          </div>
        </section>

        <ProjectDetailNav projectId={projectId || ''} />

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={taskStats.total} />
          <StatCard label="To Do" value={taskStats.todo} />
          <StatCard label="In Progress" value={taskStats.inProgress} />
          <StatCard label="In Review" value={taskStats.inReview} />
          <StatCard label="Done" value={taskStats.done} accentClassName="text-accent-green" />
          <StatCard label="Overdue" value={taskStats.overdue} accentClassName="text-accent-red" />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <HealthScoreCard
            score={summary.health.currentScore}
            trend30d={summary.health.trend30d}
            details={healthDetails}
            onOpenDetails={() => setShowHealthDialog(true)}
          />
          <AiInsightCard
            score={summary.ai.score}
            complexity={summary.ai.complexity}
            lifecycle={summary.ai.lifecycle}
            summary={summary.ai.summary}
            details={summary.ai.details}
            lastComputedAt={summary.ai.lastComputedAt}
            isRefreshing={refreshAI.isPending}
            onRefresh={() => refreshAI.mutate()}
          />
          <IntegrationStatusStrip
            repositoryCount={summary.integrations.repositories.length}
            externalLinksCount={summary.integrations.externalLinksCount}
            docLinksCount={summary.integrations.docLinksCount}
            apiDocLinksCount={summary.integrations.apiDocLinksCount}
            onManage={() => navigate(`/app/projects/${projectId}/settings`)}
          />
        </section>

        <section className="mb-6">
          <ProjectAnalyticsPanel
            analytics={analytics}
            modules={analyticsModules}
            onModulesChange={handleAnalyticsModulesChange}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-content-text">Recent Activity</h3>
            <Button variant="ghost" onClick={() => navigate(`/app/projects/${projectId}/tasks`)}>
              Open Tasks
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              {summary.activityFeed.length === 0 ? (
                <p className="text-sm text-content-text-secondary">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {summary.activityFeed.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="rounded-md border border-content-border p-3">
                      <p className="text-sm text-content-text">{activity.summary}</p>
                      <p className="mt-1 text-xs text-content-text-secondary">
                        {new Date(activity.timestamp).toLocaleString()} · {activity.source}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

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

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const title = String(formData.get('title') || '');
              handleCreateTask(title);
            }}
          >
            <div className="py-4">
              <input
                type="text"
                name="title"
                placeholder="Task title"
                autoFocus
                className="w-full rounded-md border border-content-border bg-content-bg px-3 py-2 text-sm text-content-text focus:outline-none"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
