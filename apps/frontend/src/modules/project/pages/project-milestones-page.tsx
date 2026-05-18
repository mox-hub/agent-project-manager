import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  MoreHorizontal,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCreateProjectMilestone, useProjectDashboardSummary } from '../hooks/use-project-dashboard-summary';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString();
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('done') || normalized.includes('complete')) {
    return { text: 'Completed', icon: CheckCircle2, className: 'bg-accent-green-light text-accent-green border-accent-green/30' };
  }
  if (normalized.includes('progress') || normalized.includes('active')) {
    return { text: 'In Progress', icon: TrendingUp, className: 'bg-accent-blue-light text-accent-blue border-accent-blue/30' };
  }
  return { text: 'Upcoming', icon: Clock3, className: 'bg-muted text-muted-foreground border-border' };
}

export function ProjectMilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: summary, isLoading } = useProjectDashboardSummary(projectId);
  const createMilestone = useCreateProjectMilestone(projectId);
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const milestones = summary?.milestones ?? [];
  const completedCount = milestones.filter((milestone) =>
    milestone.status.toLowerCase().includes('done') || milestone.status.toLowerCase().includes('complete'),
  ).length;

  const timelineCompletion = useMemo(() => {
    if (!milestones.length) return 0;
    return Math.round((completedCount / milestones.length) * 100);
  }, [completedCount, milestones.length]);

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectMilestones}
      projectId={projectId}
      projectName={summary?.projectMeta.name}
      title="Milestones"
      description={`${completedCount} of ${milestones.length || 0} milestones completed`}
      actions={
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setShowCreateInline(true)}
          data-ai-component="project.project-milestones.header.new-milestone"
          data-ai-action="project.project-milestones.header.new-milestone.click"
          data-ai-role="submit"
        >
          <Plus size={13} />
          New Milestone
        </Button>
      }
      contextBar={
        <div className="rounded-lg border border-border bg-background px-3 py-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} />
              {formatDate(summary?.projectMeta.startDate)}
            </span>
            <span>{formatDate(summary?.projectMeta.targetDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={timelineCompletion} className="h-2 flex-1" />
            <span className="text-xs font-medium text-foreground">{timelineCompletion}%</span>
          </div>
        </div>
      }
    >
      {showCreateInline ? (
        <section
          className="mb-4 rounded-lg border border-border bg-background p-3 motion-enter"
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
              className="h-8"
            />
            <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="h-8" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowCreateInline(false);
                setName('');
                setTargetDate('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8" disabled={createMilestone.isPending || !name.trim()}>
              {createMilestone.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        {isLoading ? (
          <div className="rounded-lg border border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
            Loading milestones...
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
            No milestones yet.
          </div>
        ) : (
          milestones.map((milestone) => {
            const tone = statusTone(milestone.status);
            const Icon = tone.icon;
            const isExpanded = expanded[milestone.id] ?? milestone.status.toLowerCase().includes('progress');

            return (
              <article key={milestone.id} className="overflow-hidden rounded-lg border border-border bg-background">
                <header
                  className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30"
                  onClick={() => setExpanded((previous) => ({ ...previous, [milestone.id]: !isExpanded }))}
                >
                  <button type="button" className="text-muted-foreground">
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  <Icon size={15} className={cn('shrink-0', tone.className.split(' ')[1])} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{milestone.name}</h3>
                      <Badge className={cn('h-5 border px-2 text-xs font-medium', tone.className)}>{tone.text}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Target date: {formatDate(milestone.targetDate)}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{milestone.status}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal size={13} />
                    </Button>
                  </div>
                </header>

                {isExpanded ? (
                  <div className="border-t border-border bg-muted/20 px-4 py-3">
                    <div className="space-y-2">
                      {summary?.iterations.length ? (
                        summary.iterations.slice(0, 4).map((iteration) => (
                          <div key={`${milestone.id}-${iteration.id}`} className="flex items-center gap-2 text-xs">
                            {iteration.status.toLowerCase().includes('done') ? (
                              <CheckCircle2 size={14} className="text-accent-green" />
                            ) : (
                              <Circle size={14} className="text-muted-foreground" />
                            )}
                            <span className="flex-1 truncate text-foreground">{iteration.name}</span>
                            <span className="text-muted-foreground">{formatDate(iteration.endDate)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No iteration tasks in this milestone.</p>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
                        <Plus size={12} />
                        Add task to milestone
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </ProjectDetailFrame>
  );
}
