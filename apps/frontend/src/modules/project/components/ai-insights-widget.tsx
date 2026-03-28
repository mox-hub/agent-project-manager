import { Button } from '@/components/ui/button';
import { useProjectAIContext, useRefreshAIContext } from '../hooks/use-project-health';

interface AIInsightsWidgetProps {
  projectId: string;
}

function getComplexityClass(level?: string | null) {
  if (level === 'low') return 'bg-accent-green-light text-accent-green';
  if (level === 'medium') return 'bg-accent-yellow-light text-accent-yellow';
  if (level === 'high') return 'bg-orange-500/20 text-orange-500';
  if (level === 'critical') return 'bg-accent-red-light text-accent-red';
  return 'bg-muted/50 text-muted-foreground';
}

function getTeamSizeLabel(size?: string | null) {
  if (size === 'solo') return 'Solo (1 developer)';
  if (size === 'small') return 'Small (2-5)';
  if (size === 'medium') return 'Medium (6-20)';
  if (size === 'large') return 'Large (20+)';
  return 'N/A';
}

export function AIInsightsWidget({ projectId }: AIInsightsWidgetProps) {
  const { data: aiContext, isLoading } = useProjectAIContext(projectId);
  const refreshContext = useRefreshAIContext(projectId);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading AI context...</div>;
  }

  if (!aiContext) {
    return (
      <section className="rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="m-0 text-base font-semibold text-foreground">AI Insights</h3>
            <p className="mt-1 text-sm text-muted-foreground">Project context for AI assistant</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refreshContext.mutate()}>
            Generate
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No AI context available yet. Click &quot;Generate&quot; to create project context.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-muted/50 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="m-0 text-base font-semibold text-foreground">AI Insights</h3>
          <p className="mt-1 text-sm text-muted-foreground">Project context for AI assistant</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refreshContext.mutate()}
          disabled={refreshContext.isPending}
        >
          {refreshContext.isPending ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {aiContext.techStack?.length ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-foreground">Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {aiContext.techStack.map((tech) => (
              <span key={tech} className="rounded bg-accent-blue/15 px-2 py-0.5 text-xs text-accent-blue">
                {tech}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Team Size</p>
          <p className="text-sm text-muted-foreground">{getTeamSizeLabel(aiContext.teamSizeCategory)}</p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Lifecycle Phase</p>
          <p className="text-sm capitalize text-muted-foreground">{aiContext.lifecyclePhase || 'N/A'}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-foreground">Complexity</p>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${getComplexityClass(aiContext.complexityLevel)}`}>
          {aiContext.complexityLevel?.toUpperCase() || 'N/A'}
        </span>
      </div>

      {aiContext.autoSummary ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">AI Summary</p>
          <div className="rounded-md bg-background px-3 py-2 text-sm leading-6 text-muted-foreground">
            {aiContext.autoSummary}
          </div>
        </div>
      ) : null}

      {aiContext.lastComputedAt ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Last updated: {new Date(aiContext.lastComputedAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
