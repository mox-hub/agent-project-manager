import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangleIcon,
  CheckSquare,
  ChevronRight,
  Clock,
  Copy,
  Plus,
  Settings,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkeletonList } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { STATS_THEMES } from '@/components/ui/stats-card';
import { Progress } from '@/components/ui/progress';
import { useCreateTask } from '@/modules/task/hooks/use-project-tasks';
import { useRefreshAIContext } from '../hooks/use-project-health';
import {
  selectProjectHealthDetails,
  useProjectDashboardSummary,
} from '../hooks/use-project-dashboard-summary';
import { IntegrationStatusStrip } from '../components/dashboard/integration-status-strip';
import { ProjectHealthScoreDialog } from '../components/dashboard/project-health-score-dialog';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { ProjectOverviewCharts } from '../components/dashboard/project-overview-charts';
import { AiInsightCard } from '../components/dashboard/ai-insight-card';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function workloadTrackClass(load: number) {
  if (load >= 60) return '[&>div]:bg-accent-red';
  if (load >= 40) return '[&>div]:bg-accent-yellow';
  return '[&>div]:bg-accent-green';
}

export function ProjectDashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading, isError } = useProjectDashboardSummary(projectId);
  const createTask = useCreateTask();
  const refreshAI = useRefreshAIContext(projectId || '');
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showHealthDialog, setShowHealthDialog] = useState(false);

  const project = summary?.projectMeta;
  const taskStats = summary?.taskStats;
  const healthDetails = selectProjectHealthDetails(summary);

  const healthLabel = (score: number) =>
    score >= 80
      ? t('project.health.onTrack')
      : score >= 60
        ? t('project.health.atRisk')
        : t('project.health.offTrack');

  const dateRange =
    !project?.startDate && !project?.targetDate
      ? t('project.detail.noSchedule')
      : `${project?.startDate ? new Date(project.startDate).toLocaleDateString() : t('project.detail.notAvailable')} - ${project?.targetDate ? new Date(project.targetDate).toLocaleDateString() : t('project.detail.notAvailable')}`;

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
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <SkeletonList count={6} avatar />
      </div>
    );
  }

  if (isError || !summary || !project || !taskStats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangleIcon className="size-4" />
          <AlertDescription>
            加载项目概览失败，请稍后重试。
          </AlertDescription>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            重新加载
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <ProjectDetailFrame
        aiPage={CORE_AI_PAGE_IDS.projectDashboard}
        projectId={projectId || ''}
        projectName={project.name}
        title={t('project.detail.overview')}
        description={project.description || t('project.detail.noDescription')}
        hideBreadcrumb
        topActions={null}
        trackingScore={summary.health.currentScore}
        trackingLabel={healthLabel(summary.health.currentScore)}
        actions={(
          <>
            <Badge variant="secondary">{t(`project.type.${project.type}`, project.type)}</Badge>
            <Badge variant="outline" className="capitalize">
              {project.status}
            </Badge>
            <HeaderActionButton
              variant="outline"
              icon={Settings}
              label={t('project.detail.editProject')}
              onClick={() => navigate(`/app/projects/${projectId}/settings`)}
            />
            <HeaderActionButton
              variant="outline"
              icon={Copy}
              label={t('project.detail.share')}
              onClick={handleCopyLink}
            />
            <HeaderActionButton
              icon={Plus}
              label={t('project.detail.addTask')}
              onClick={() => setShowCreateInline(true)}
              data-ai-component="project.project-dashboard.header.new-task"
              data-ai-action="project.project-dashboard.header.new-task.click"
              data-ai-role="submit"
            />
          </>
        )}
      >
        <p className="mb-4 text-xs text-muted-foreground">{dateRange}</p>

        {showCreateInline ? (
          <section
            className="mb-4 rounded-lg border border-border bg-muted/50 p-4 motion-enter"
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
                placeholder={t('project.detail.taskTitle')}
                autoFocus
                className="h-9 min-w-65 flex-1 bg-background"
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
                {t('project.detail.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || !newTaskTitle.trim()}
                data-ai-component="project.project-dashboard.inline-create.submit"
                data-ai-action="project.project-dashboard.inline-create.submit.click"
                data-ai-role="submit"
              >
                {createTask.isPending ? t('project.detail.creating') : t('project.detail.create')}
              </Button>
            </form>
          </section>
        ) : null}

        {/* ── Stats Row (4 cards) ───────────────────────────────────── */}
        <section className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4" data-ai-component="stat-cards">
          <StatCard
            label={t('project.detail.tasksCompleted')}
            value={taskStats.done}
            hint={`${taskStats.total} ${t('project.detail.tasksCount')}`}
            icon={<CheckSquare className={cn('size-4', STATS_THEMES.green.iconColorClass)} />}
            iconBg={STATS_THEMES.green.colorClass}
          />
          <StatCard
            label={t('project.detail.projectHealth')}
            value={summary.health.currentScore}
            hint={healthLabel(summary.health.currentScore)}
            icon={<Activity className={cn('size-4', STATS_THEMES.blue.iconColorClass)} />}
            iconBg={STATS_THEMES.blue.colorClass}
            trend={summary.health.trend30d >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(summary.health.trend30d)} ${t('project.detail.pointsShort')}`}
            onClick={() => setShowHealthDialog(true)}
          />
          <StatCard
            label={t('project.detail.teamVelocity')}
            value={taskStats.inProgress + taskStats.inReview}
            hint={`${taskStats.inProgress} ${t('project.detail.active')} · ${taskStats.inReview} ${t('project.detail.inReview')}`}
            icon={<Zap className={cn('size-4', STATS_THEMES.yellow.iconColorClass)} />}
            iconBg={STATS_THEMES.yellow.colorClass}
          />
          <StatCard
            label={t('project.detail.overdueTasks')}
            value={taskStats.overdue}
            hint={taskStats.overdue > 0 ? t('project.detail.requiresAttention') : t('project.detail.allOnTrack')}
            icon={<Clock className={cn('size-4', STATS_THEMES.red.iconColorClass)} />}
            iconBg={STATS_THEMES.red.colorClass}
            onClick={() => navigate(`/app/projects/${projectId}/tasks`)}
          />
        </section>

        {/* ── Charts Row (Burndown + Task Distribution) ─────────────── */}
        <div className="mb-4">
          <ProjectOverviewCharts summary={summary} />
        </div>

        {/* ── Bottom Row (Recent Activity + AI Insights) ────────────── */}
        <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4">
              <CardTitle className="text-sm font-medium">
                {t('project.detail.recentActivity')}
              </CardTitle>
              <Button
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground"
                onClick={() => navigate(`/app/projects/${projectId}/tasks`)}
              >
                {t('project.detail.viewAll')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              {summary.activityFeed.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('project.detail.noRecentActivity')}</p>
              ) : (
                summary.activityFeed.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="min-w-0">
                    <p className="truncate text-xs text-foreground">{activity.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()} · {activity.source}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <AiInsightCard
            score={summary.ai.score}
            complexity={summary.ai.complexity}
            lifecycle={summary.ai.lifecycle}
            teamSize={summary.ai.teamSize}
            summary={summary.ai.summary}
            details={summary.ai.details}
            aiContext={{
              techStack: null,
              frameworks: null,
              lifecyclePhase: summary.ai.lifecycle,
              complexityLevel: summary.ai.complexity,
              teamSizeCategory: summary.ai.teamSize,
              healthScore: summary.ai.score,
              riskIndicators: null,
            }}
            lastComputedAt={summary.ai.lastComputedAt}
            isRefreshing={refreshAI.isPending}
            onRefresh={() => refreshAI.mutate()}
          />
        </section>

        {/* ── Team Workload (compact) ────────────────────────────────── */}
        <section className="mb-4">
          <Card>
            <CardHeader className="flex items-center justify-between p-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                {t('project.detail.teamWorkload')}
              </CardTitle>
              <Button
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground"
                onClick={() => navigate(`/app/projects/${projectId}/team`)}
              >
                {t('project.detail.viewTeam')} <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {summary.teamWorkload.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('project.detail.noTeamData')}</p>
              ) : (
                <div className="space-y-3">
                  {summary.teamWorkload.slice(0, 5).map((member) => (
                    <div key={member.memberId} className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-xs">
                          {member.memberName.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{member.memberName}</span>
                          <span className="text-xs text-muted-foreground">
                            {member.taskCount} {t('project.detail.tasksCount')} · {member.percentage}%
                          </span>
                        </div>
                        <Progress
                          value={member.percentage}
                          className={cn('h-1.5', workloadTrackClass(member.percentage))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Integration Status ─────────────────────────────────────── */}
        <section className="mb-4">
          <IntegrationStatusStrip
            repositoryCount={summary.integrations.repositories.length}
            externalLinksCount={summary.integrations.externalLinksCount}
            docLinksCount={summary.integrations.docLinksCount}
            apiDocLinksCount={summary.integrations.apiDocLinksCount}
            memberCount={summary.projectMeta.members?.length ?? 0}
            onManage={() => navigate(`/app/projects/${projectId}/settings`)}
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
