import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';
import { useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';

function getWorkloadBarClass(percentage: number) {
  if (percentage >= 60) return 'bg-accent-red';
  if (percentage <= 20) return 'bg-accent-green';
  return 'bg-accent-blue';
}

export function ProjectTeamPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);

  const sortedWorkload = useMemo(() => {
    const workload = summary?.teamWorkload ?? [];
    return [...workload].sort((a, b) => b.percentage - a.percentage);
  }, [summary?.teamWorkload]);

  if (!projectId) {
    return <div className="p-6 text-sm text-content-text-secondary">Project not found.</div>;
  }

  return (
    <PageShell className="p-6">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-content-text">Team Workload</h1>
          <Button onClick={() => navigate(`/app/projects/${projectId}/tasks`)}>
            Balance Workload
          </Button>
        </div>

        <ProjectDetailNav projectId={projectId} />

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
                  <div key={member.memberId} className="rounded-md border border-content-border p-3">
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
      </div>
    </PageShell>
  );
}
