import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangleIcon, RefreshCw, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkeletonList } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { useProjectDetail } from '../hooks/use-project-detail';
import { LinearSyncLogDrawer } from '@/modules/linear/components/linear-sync-log-drawer';
import { useSyncTasks } from '@/modules/linear/hooks/use-linear-sync';
import { toast } from '@/hooks/use-toast';
import { ProjectRolesSection } from '@/modules/project-role/components/project-roles-section';

function workloadColor(load: number) {
  if (load >= 70) return 'text-accent-red';
  if (load >= 40) return 'text-accent-yellow';
  return 'text-accent-green';
}

function workloadIndicatorClass(load: number) {
  if (load >= 70) return '[&_[data-slot=progress-indicator]]:bg-accent-red';
  if (load >= 40) return '[&_[data-slot=progress-indicator]]:bg-accent-yellow';
  return '[&_[data-slot=progress-indicator]]:bg-accent-green';
}

export function ProjectTeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const { data: summary, isLoading, isError, error } = useProjectDashboardSummary(projectId);
  const { data: project } = useProjectDetail(projectId);
  const syncTasks = useSyncTasks();
  const [searchKeyword, setSearchKeyword] = useState('');

  const members = useMemo(() => summary?.teamWorkload ?? [], [summary?.teamWorkload]);
  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        member.memberName.toLowerCase().includes(searchKeyword.trim().toLowerCase()),
      ),
    [members, searchKeyword],
  );

  const isLinearLinked = project?.externalProvider === 'linear';

  const handleTeamSync = () => {
    if (!projectId) return;
    syncTasks.mutate(
      { projectId, direction: 'two-way' },
      {
        onSuccess: (summary) => {
          toast({
            title: t('project.team.syncCompleteTitle'),
            description: t('project.team.syncCompleteDesc', {
              added: summary.added,
              updated: summary.updated,
              conflicts: summary.conflicts,
            }),
          });
        },
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: t('project.team.syncFailedTitle'),
            description: err instanceof Error ? err.message : t('linearSync.unknownError'),
          });
        },
      },
    );
  };

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">{t('project.detail.notFound')}</div>;
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectTeam}
      projectId={projectId}
      projectName={summary?.projectMeta.name}
      title={t('project.detail.team')}
      hideBreadcrumb
      description={t('project.detail.teamDesc', {
        count: members.length,
        visibility: t(`project.visibility.${summary?.projectMeta.visibility ?? 'internal'}`, summary?.projectMeta.visibility ?? 'internal'),
      })}
      actions={
        isLinearLinked ? (
          <>
            <HeaderActionButton
              variant="outline"
              icon={RefreshCw}
              iconClassName={syncTasks.isPending ? 'animate-spin' : undefined}
              label={t('project.team.syncTasks')}
              disabled={syncTasks.isPending}
              onClick={handleTeamSync}
              data-ai-component="project.project-team.sync"
              data-ai-action="project.project-team.sync.click"
            />
            <LinearSyncLogDrawer />
          </>
        ) : null
      }
    >
      <div className="space-y-4">
        <SectionCard
          title={t('project.team.title')}
          actions={
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <Input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder={t('project.team.searchMembers')}
                className="h-8 pl-9 text-xs"
              />
            </div>
          }
        >
          {isError ? (
            <Alert variant="destructive" className="text-left">
              <AlertTriangleIcon className="size-4" />
              <AlertDescription>
                {error?.message || t('project.team.loadFailed')}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <SkeletonList count={4} avatar />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredMembers.map((member) => (
                  <Card key={member.memberId} size="sm" className="gap-3">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                          <AvatarFallback>
                            {member.memberName.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="truncate leading-tight">
                            {member.memberName}
                          </CardTitle>
                          <CardDescription className="truncate">
                            {member.memberId}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="gap-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-lg font-semibold leading-none text-foreground">
                            {member.taskCount}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{t('project.team.total')}</p>
                        </div>
                        <div className="rounded-lg bg-accent-blue-light/30 p-2 text-center">
                          <p className="text-lg font-semibold leading-none text-accent-blue">
                            {Math.max(0, Math.round((member.taskCount * member.percentage) / 100))}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{t('project.team.activeTask')}</p>
                        </div>
                        <div className="rounded-lg bg-accent-green-light/30 p-2 text-center">
                          <p className="text-lg font-semibold leading-none text-accent-green">
                            {Math.max(0, member.taskCount - Math.round((member.taskCount * member.percentage) / 100))}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{t('project.team.doneTask')}</p>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{t('project.team.workload')}</span>
                          <span className={cn('text-xs font-medium', workloadColor(member.percentage))}>
                            {member.percentage}%
                          </span>
                        </div>
                        <Progress
                          value={member.percentage}
                          className={workloadIndicatorClass(member.percentage)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredMembers.length === 0 ? (
                <EmptyState
                  title={
                    members.length === 0
                      ? t('project.team.noMembers')
                      : t('project.team.noMatch')
                  }
                />
              ) : null}
            </>
          )}
        </SectionCard>

        <ProjectRolesSection projectId={projectId} />
      </div>
    </ProjectDetailFrame>
  );
}
