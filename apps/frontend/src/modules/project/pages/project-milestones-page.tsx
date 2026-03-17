import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AttentionRail } from '@/components/ui/attention-rail';
import { Plus } from 'lucide-react';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';
import { useCreateProjectMilestone, useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { toast } from '@/hooks/use-toast';

export function ProjectMilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);
  const createMilestone = useCreateProjectMilestone(projectId);
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');

  if (!projectId) {
    return (
      <PageShell className="p-6" aiPage={CORE_AI_PAGE_IDS.projectMilestones}>
        <div className="text-sm text-content-text-secondary">Project not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectMilestones}>
      <div className="mx-auto w-full max-w-[1280px]">
        <section
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-content-border bg-content-bg-secondary p-4 motion-enter"
          data-ai-component="project.project-milestones.header"
          data-ai-role="content"
        >
          <h1 className="text-2xl font-semibold text-content-text">Milestones</h1>
          <Button
            size="sm"
            onClick={() => setShowCreateInline(true)}
            data-ai-component="project.project-milestones.header.new-milestone"
            data-ai-action="project.project-milestones.header.new-milestone.click"
            data-ai-role="submit"
          >
            <Plus size={14} />
            New Milestone
          </Button>
        </section>

        {showCreateInline ? (
          <section
            className="mb-4 rounded-xl border border-content-border bg-content-bg p-4 motion-enter"
            data-ai-component="project.project-milestones.inline-create"
            data-ai-role="panel"
          >
            <form
              className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_190px_auto_auto]"
              onSubmit={async (event) => {
                event.preventDefault();
                const normalizedName = name.trim();
                if (!normalizedName) return;
                await createMilestone.mutateAsync({
                  name: normalizedName,
                  targetDate: targetDate ? `${targetDate}T00:00:00.000Z` : null,
                });
                setName('');
                setTargetDate('');
                setShowCreateInline(false);
                toast({ title: 'Milestone created', description: '里程碑已添加到项目中。' });
              }}
            >
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Milestone name"
                autoFocus
                data-ai-component="project.project-milestones.inline-create.name"
                data-ai-action="project.project-milestones.inline-create.name.change"
                data-ai-role="input"
              />
              <Input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                data-ai-component="project.project-milestones.inline-create.target-date"
                data-ai-action="project.project-milestones.inline-create.target-date.change"
                data-ai-role="input"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateInline(false);
                  setName('');
                  setTargetDate('');
                }}
                data-ai-component="project.project-milestones.inline-create.cancel"
                data-ai-action="project.project-milestones.inline-create.cancel.click"
                data-ai-role="jump"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMilestone.isPending || !name.trim()}
                data-ai-component="project.project-milestones.inline-create.submit"
                data-ai-action="project.project-milestones.inline-create.submit.click"
                data-ai-role="submit"
              >
                {createMilestone.isPending ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </section>
        ) : null}

        <ProjectDetailNav projectId={projectId} />

        <section
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-content-border bg-content-bg-secondary p-3 text-xs text-content-text-secondary"
          data-ai-component="project.project-milestones.context-bar"
          data-ai-role="filter"
        >
          <span className="rounded-full bg-content-bg px-3 py-1">
            Iterations: {summary?.iterations.length ?? 0}
          </span>
          <span className="rounded-full bg-content-bg px-3 py-1">
            Milestones: {summary?.milestones.length ?? 0}
          </span>
        </section>

        <Card className="mb-4">
          <CardHeader className="border-b border-content-border">
            <CardTitle>Iterations</CardTitle>
            <CardDescription>项目当前迭代阶段</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <p className="text-sm text-content-text-secondary">Loading...</p>
            ) : summary?.iterations.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {summary.iterations.map((iteration) => (
                  <div key={iteration.id} className="rounded-md border border-content-border p-3">
                    <p className="text-sm font-medium text-content-text">{iteration.name}</p>
                    <p className="mt-1 text-xs text-content-text-secondary">
                      {new Date(iteration.startDate).toLocaleDateString()} - {new Date(iteration.endDate).toLocaleDateString()}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {iteration.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-content-text-secondary">No iterations.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-content-border">
            <CardTitle>Milestone List</CardTitle>
            <CardDescription>由真实里程碑数据驱动</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <p className="text-sm text-content-text-secondary">Loading...</p>
            ) : summary?.milestones.length ? (
              <div className="space-y-3">
                {summary.milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-md border border-content-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-content-text">{milestone.name}</p>
                      <Badge variant="outline">{milestone.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-content-text-secondary">
                      Target: {milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-content-text-secondary">No milestones yet.</p>
            )}
          </CardContent>
        </Card>

        <section className="mt-4">
          <AttentionRail
            aiPrefix="project.project-milestones"
            items={[
              {
                id: 'project-board',
                title: '切换到项目看板',
                description: '在任务维度推进里程碑执行进度',
                to: `/app/projects/${projectId}/board`,
              },
              {
                id: 'project-dashboard',
                title: '查看项目健康度',
                description: '从仪表盘查看风险与 AI 评估',
                to: `/app/projects/${projectId}/dashboard`,
              },
            ]}
          />
        </section>
      </div>
    </PageShell>
  );
}
