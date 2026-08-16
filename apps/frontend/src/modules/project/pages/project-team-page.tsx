import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MoreHorizontal, Plus, Search, Sparkles, AlertTriangleIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkeletonList } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { AiAgentBadge } from '@/shared/components/ai-agent-badge';
import { AiExecutionIndicator } from '@/shared/components/ai-execution-indicator';
import { cn } from '@/lib/utils';
import { useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { useProjectDetail } from '../hooks/use-project-detail';
import { LinearSyncLogDrawer } from '@/modules/linear/components/linear-sync-log-drawer';
import { useSyncTasks } from '@/modules/linear/hooks/use-linear-sync';
import { toast } from '@/hooks/use-toast';

function workloadColor(load: number) {
  if (load >= 70) return 'text-accent-red';
  if (load >= 40) return 'text-accent-yellow';
  return 'text-accent-green';
}

function workloadTrackClass(load: number) {
  if (load >= 70) return '[&>div]:bg-accent-red';
  if (load >= 40) return '[&>div]:bg-accent-yellow';
  return '[&>div]:bg-accent-green';
}

export function ProjectTeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
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
            title: 'Team sync complete',
            description: `added ${summary.added}, updated ${summary.updated}, conflicts ${summary.conflicts}`,
          });
        },
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Team sync failed',
            description: err instanceof Error ? err.message : 'Unknown error',
          });
        },
      },
    );
  };

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectTeam}
      projectId={projectId}
      projectName={summary?.projectMeta.name}
      title="Team"
      hideBreadcrumb
      description={`${members.length} members · ${summary?.projectMeta.visibility ?? 'internal'} project`}
      actions={
        <>
          {isLinearLinked ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={syncTasks.isPending}
                onClick={handleTeamSync}
                data-ai-component="project.project-team.sync"
                data-ai-action="project.project-team.sync.click"
              >
                <RefreshCw
                  size={13}
                  className={syncTasks.isPending ? 'animate-spin' : undefined}
                />
                Sync team tasks
              </Button>
              <LinearSyncLogDrawer />
            </>
          ) : null}
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Sparkles size={13} className="text-accent-purple" />
            AI Workload
          </Button>
          <Button size="sm" className="h-8 gap-1.5">
            <Plus size={13} />
            Invite Member
          </Button>
        </>
      }
      contextBar={
        <div className="max-w-[320px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Search members..."
              className="h-8 pl-9 text-xs"
            />
          </div>
        </div>
      }
    >
      {isError ? (
        <div className="rounded-lg border border-border bg-background p-6">
          <Alert variant="destructive" className="text-left">
            <AlertTriangleIcon className="size-4" />
            <AlertDescription>
              {error?.message || "无法加载团队成员"}
            </AlertDescription>
          </Alert>
        </div>
      ) : isLoading ? (
        <div className="rounded-lg border border-border bg-background p-4">
          <SkeletonList count={4} avatar />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredMembers.map((member) => (
              <article key={member.memberId} className="rounded-lg border border-border bg-background p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                      <AvatarFallback>{member.memberName.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold leading-none text-foreground">{member.memberName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Project Member</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                    <MoreHorizontal size={14} />
                  </Button>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <Badge className="border border-border bg-muted px-2 py-0 text-xs text-muted-foreground">Member</Badge>
                  <span className="truncate text-xs text-muted-foreground">{member.memberId}</span>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-lg font-semibold leading-none text-foreground">{member.taskCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-accent-blue-light/30 p-2 text-center">
                    <p className="text-lg font-semibold leading-none text-accent-blue">{Math.max(0, Math.round((member.taskCount * member.percentage) / 100))}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="rounded-lg bg-accent-green-light/30 p-2 text-center">
                    <p className="text-lg font-semibold leading-none text-accent-green">
                      {Math.max(0, member.taskCount - Math.round((member.taskCount * member.percentage) / 100))}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Done</p>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Workload</span>
                    <span className={cn('text-xs font-medium', workloadColor(member.percentage))}>{member.percentage}%</span>
                  </div>
                  <Progress value={member.percentage} className={cn('h-1.5', workloadTrackClass(member.percentage))} />
                </div>
              </article>
            ))}
          </section>

          {/* AI Agent Section */}
          <section className="mt-6 rounded-lg border border-accent-purple/30 bg-accent-purple-light/10 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple-light/50">
                <Sparkles size={18} className="text-accent-purple" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">AI Agents</p>
                <p className="text-xs text-muted-foreground">Autonomous task executors</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <AiAgentBadge />
                <Badge className="bg-accent-green-light/50 text-accent-green">Online</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-accent-blue-light/20 p-3 text-center">
                <p className="text-xl font-semibold leading-none text-accent-blue">1</p>
                <p className="mt-1 text-xs text-muted-foreground">Running</p>
              </div>
              <div className="rounded-lg bg-accent-green-light/20 p-3 text-center">
                <p className="text-xl font-semibold leading-none text-accent-green">2</p>
                <p className="mt-1 text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg bg-accent-yellow-light/20 p-3 text-center">
                <p className="text-xl font-semibold leading-none text-accent-yellow">1</p>
                <p className="mt-1 text-xs text-muted-foreground">Pending</p>
              </div>
            </div>

            {/* AI Agent execution statuses */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <AiExecutionIndicator status="running" />
              <AiExecutionIndicator status="completed" />
              <AiExecutionIndicator status="pending" />
            </div>
          </section>

          {filteredMembers.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              No members matched your search.
            </div>
          ) : null}
        </>
      )}
    </ProjectDetailFrame>
  );
}
