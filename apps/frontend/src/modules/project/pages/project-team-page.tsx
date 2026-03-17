import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AttentionRail } from '@/components/ui/attention-rail';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';
import { useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';

function getWorkloadBarClass(percentage: number) {
  if (percentage >= 60) return 'bg-accent-red';
  if (percentage <= 20) return 'bg-accent-green';
  return 'bg-accent-blue';
}

export function ProjectTeamPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);

  const sortedWorkload = [...(summary?.teamWorkload ?? [])].sort((a, b) => b.percentage - a.percentage);
  const overloadedCount = sortedWorkload.filter((member) => member.percentage >= 60).length;

  if (!projectId) {
    return (
      <PageShell className="p-6" aiPage={CORE_AI_PAGE_IDS.projectTeam}>
        <div className="text-sm text-content-text-secondary">Project not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectTeam}>
      <div className="mx-auto w-full max-w-[1280px]">
        <section
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-content-border bg-content-bg-secondary p-4 motion-enter"
          data-ai-component="project.project-team.header"
          data-ai-role="content"
        >
          <h1 className="text-2xl font-semibold text-content-text">Team Workload</h1>
          <Button
            onClick={() => navigate(`/app/projects/${projectId}/tasks`)}
            data-ai-component="project.project-team.header.balance"
            data-ai-action="project.project-team.header.balance.click"
            data-ai-role="jump"
          >
            Balance Workload
          </Button>
        </section>

        <ProjectDetailNav projectId={projectId} />

        <section
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-content-border bg-content-bg-secondary p-3 text-xs text-content-text-secondary"
          data-ai-component="project.project-team.context-bar"
          data-ai-role="filter"
        >
          <span className="rounded-full bg-content-bg px-3 py-1">
            Members: {sortedWorkload.length}
          </span>
          <span className="rounded-full bg-content-bg px-3 py-1">
            Overloaded: {overloadedCount}
          </span>
        </section>

        <Card>
          <CardHeader className="border-b border-content-border">
            <CardTitle>Assignee Capacity</CardTitle>
            <CardDescription>根据当前任务分配实时计算负载</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <p className="text-sm text-content-text-secondary">Loading...</p>
            ) : sortedWorkload.length === 0 ? (
              <p className="text-sm text-content-text-secondary">No assignee workload data.</p>
            ) : (
              <div className="space-y-4">
                {sortedWorkload.map((member) => (
                  <div
                    key={member.memberId}
                    className="rounded-lg border border-content-border p-3"
                    data-ai-component={`project.project-team.member.${member.memberId}`}
                    data-ai-role="content"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                          <AvatarFallback>{member.memberName.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-content-text">{member.memberName}</span>
                      </div>
                      <span className="text-xs text-content-text-secondary">
                        {member.taskCount} tasks · {member.percentage}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-content-bg-secondary">
                      <div
                        className={`h-full rounded-full ${getWorkloadBarClass(member.percentage)}`}
                        style={{ width: `${member.percentage}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(`/app/projects/${projectId}/tasks?filters=${encodeURIComponent(JSON.stringify({ assigneeId: [member.memberId] }))}`)
                        }
                        data-ai-component={`project.project-team.member.${member.memberId}.view-tasks`}
                        data-ai-action={`project.project-team.member.${member.memberId}.view-tasks.click`}
                        data-ai-role="jump"
                      >
                        View Tasks
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <section className="mt-4">
          <AttentionRail
            aiPrefix="project.project-team"
            items={[
              {
                id: 'project-board',
                title: '进入任务看板',
                description: '按照负责人快速过滤并调整任务负载',
                to: `/app/projects/${projectId}/board`,
              },
              {
                id: 'project-settings',
                title: '管理项目成员',
                description: '前往设置调整成员与权限',
                to: `/app/projects/${projectId}/settings`,
              },
            ]}
          />
        </section>
      </div>
    </PageShell>
  );
}
