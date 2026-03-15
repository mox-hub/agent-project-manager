import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';
import { useCreateProjectMilestone, useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';

export function ProjectMilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);
  const createMilestone = useCreateProjectMilestone(projectId);
  const [showCreate, setShowCreate] = useState(false);

  if (!projectId) {
    return <div className="p-6 text-sm text-content-text-secondary">Project not found.</div>;
  }

  return (
    <PageShell className="p-6">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-content-text">Milestones</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New Milestone
          </Button>
        </div>

        <ProjectDetailNav projectId={projectId} />

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
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Milestone</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const name = String(form.get('name') || '').trim();
              const targetDate = String(form.get('targetDate') || '').trim();
              if (!name) return;
              await createMilestone.mutateAsync({
                name,
                targetDate: targetDate ? `${targetDate}T00:00:00.000Z` : null,
              });
              setShowCreate(false);
            }}
          >
            <div className="space-y-3 py-4">
              <input
                type="text"
                name="name"
                placeholder="Milestone name"
                className="w-full rounded-md border border-content-border bg-content-bg px-3 py-2 text-sm text-content-text focus:outline-none"
              />
              <input
                type="date"
                name="targetDate"
                className="w-full rounded-md border border-content-border bg-content-bg px-3 py-2 text-sm text-content-text focus:outline-none"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMilestone.isPending}>
                {createMilestone.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
