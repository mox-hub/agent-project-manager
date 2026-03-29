import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MoreHorizontal, Plus, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';

function workloadColor(load: number) {
  if (load >= 70) return 'text-red-500';
  if (load >= 40) return 'text-amber-500';
  return 'text-emerald-500';
}

function workloadTrackClass(load: number) {
  if (load >= 70) return '[&>div]:bg-red-500';
  if (load >= 40) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-emerald-500';
}

export function ProjectTeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);
  const [searchKeyword, setSearchKeyword] = useState('');

  const members = useMemo(() => summary?.teamWorkload ?? [], [summary?.teamWorkload]);
  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        member.memberName.toLowerCase().includes(searchKeyword.trim().toLowerCase()),
      ),
    [members, searchKeyword],
  );

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectTeam}
      projectId={projectId}
      projectName={summary?.projectMeta.name}
      title="Team"
      description={`${members.length} members · ${summary?.projectMeta.visibility ?? 'internal'} project`}
      actions={
        <>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Sparkles size={13} className="text-violet-500" />
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
      {isLoading ? (
        <div className="rounded-xl border border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
          Loading team members...
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredMembers.map((member) => (
              <article key={member.memberId} className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                      <AvatarFallback>{member.memberName.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[22px] font-semibold leading-none text-foreground">{member.memberName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Project Member</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal size={14} />
                  </Button>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <Badge className="border border-border bg-muted px-2 py-0 text-[10px] text-muted-foreground">Member</Badge>
                  <span className="truncate text-xs text-muted-foreground">{member.memberId}</span>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-lg font-semibold leading-none text-foreground">{member.taskCount}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2 text-center dark:bg-blue-950/30">
                    <p className="text-lg font-semibold leading-none text-blue-600">{Math.max(0, Math.round((member.taskCount * member.percentage) / 100))}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Active</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950/30">
                    <p className="text-lg font-semibold leading-none text-emerald-600">
                      {Math.max(0, member.taskCount - Math.round((member.taskCount * member.percentage) / 100))}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Done</p>
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

          <section className="mt-6 rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                <Sparkles size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">AI Agent</p>
                <p className="text-xs text-muted-foreground">Autonomous task executor</p>
              </div>
              <Badge className="ml-auto bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
                Active
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950/30">
                <p className="text-xl font-semibold leading-none text-blue-600">1</p>
                <p className="mt-1 text-xs text-muted-foreground">Running</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
                <p className="text-xl font-semibold leading-none text-emerald-600">2</p>
                <p className="mt-1 text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/30">
                <p className="text-xl font-semibold leading-none text-amber-600">1</p>
                <p className="mt-1 text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </section>

          {filteredMembers.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              No members matched your search.
            </div>
          ) : null}
        </>
      )}
    </ProjectDetailFrame>
  );
}
