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
  return 'bg-content-bg-secondary text-content-text-secondary';
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
    return <div className="p-4 text-sm text-content-text-secondary">Loading AI context...</div>;
  }

  if (!aiContext) {
    return (
      <section className="rounded-lg border border-content-border bg-content-bg-secondary p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="m-0 text-base font-semibold text-content-text">AI Insights</h3>
            <p className="mt-1 text-sm text-content-text-secondary">Project context for AI assistant</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refreshContext.mutate()}>
            Generate
          </Button>
        </div>
        <p className="mt-4 text-sm text-content-text-secondary">
          No AI context available yet. Click &quot;Generate&quot; to create project context.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-content-border bg-content-bg-secondary p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="m-0 text-base font-semibold text-content-text">AI Insights</h3>
          <p className="mt-1 text-sm text-content-text-secondary">Project context for AI assistant</p>
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
          <p className="mb-2 text-sm font-medium text-content-text">Tech Stack</p>
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
          <p className="mb-1 text-sm font-medium text-content-text">Team Size</p>
          <p className="text-sm text-content-text-secondary">{getTeamSizeLabel(aiContext.teamSizeCategory)}</p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-content-text">Lifecycle Phase</p>
          <p className="text-sm capitalize text-content-text-secondary">{aiContext.lifecyclePhase || 'N/A'}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-content-text">Complexity</p>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${getComplexityClass(aiContext.complexityLevel)}`}>
          {aiContext.complexityLevel?.toUpperCase() || 'N/A'}
        </span>
      </div>

      {aiContext.autoSummary ? (
        <div>
          <p className="mb-2 text-sm font-medium text-content-text">AI Summary</p>
          <div className="rounded-md bg-content-bg px-3 py-2 text-sm leading-6 text-content-text-secondary">
            {aiContext.autoSummary}
          </div>
        </div>
      ) : null}

      {aiContext.lastComputedAt ? (
        <p className="mt-4 text-xs text-content-text-secondary">
          Last updated: {new Date(aiContext.lastComputedAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
