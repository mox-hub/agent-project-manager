import { useProjectHealthSnapshots } from '../hooks/use-project-health';

interface ProjectHealthWidgetProps {
  projectId: string;
  compact?: boolean;
}

function getHealthColorClasses(score: number) {
  if (score >= 80) {
    return {
      text: 'text-status-on-track',
      bg: 'bg-status-on-track',
      soft: 'bg-status-on-track/15 border-status-on-track/30',
    };
  }
  if (score >= 60) {
    return {
      text: 'text-status-at-risk',
      bg: 'bg-status-at-risk',
      soft: 'bg-status-at-risk/15 border-status-at-risk/30',
    };
  }
  if (score >= 40) {
    return {
      text: 'text-accent-yellow',
      bg: 'bg-accent-yellow',
      soft: 'bg-accent-yellow/15 border-accent-yellow/30',
    };
  }
  return {
    text: 'text-status-off-track',
    bg: 'bg-status-off-track',
    soft: 'bg-status-off-track/15 border-status-off-track/30',
  };
}

function getHealthLabel(score: number) {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'At Risk';
  return 'Critical';
}

function getMetricBarClass(value: number) {
  if (value >= 0.8) return 'bg-status-on-track';
  if (value >= 0.5) return 'bg-status-at-risk';
  return 'bg-status-off-track';
}

export function ProjectHealthWidget({ projectId, compact = false }: ProjectHealthWidgetProps) {
  const { data: snapshots, isLoading } = useProjectHealthSnapshots(projectId, 30);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading health data...</div>;
  }

  const currentScore = snapshots?.[snapshots.length - 1]?.healthScore ?? 0;
  const previousScore = snapshots && snapshots.length > 1 ? snapshots[snapshots.length - 2]?.healthScore : currentScore;
  const scoreChange = currentScore - previousScore;

  const health = getHealthColorClasses(currentScore);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 rounded-lg border p-3 ${health.soft}`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${health.bg}`}>
          {currentScore}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{getHealthLabel(currentScore)}</p>
          <p className={`text-xs ${scoreChange >= 0 ? 'text-status-on-track' : 'text-status-off-track'}`}>
            {scoreChange >= 0 ? '↑' : '↓'} {Math.abs(scoreChange)} pts vs last week
          </p>
        </div>
      </div>
    );
  }

  const latest = snapshots?.[snapshots.length - 1];
  const breakdown = latest?.breakdown;

  return (
    <section className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="m-0 text-base font-semibold text-foreground">Project Health</h3>
          <p className="mt-1 text-sm text-muted-foreground">Overall health score based on multiple factors</p>
        </div>
        <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white ${health.bg}`}>
          {currentScore}
        </div>
      </div>

      <div className="mb-4 flex justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className={`font-semibold ${health.text}`}>{getHealthLabel(currentScore)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Change (30d)</p>
          <p className={`font-semibold ${scoreChange >= 0 ? 'text-status-on-track' : 'text-status-off-track'}`}>
            {scoreChange >= 0 ? '+' : ''}
            {scoreChange} pts
          </p>
        </div>
      </div>

      {breakdown ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Health Breakdown</p>
          <div className="space-y-2">
            {[
              { label: 'Iteration Completion', value: breakdown.iterationCompletionRate ?? 0 },
              { label: 'Task Overdue', value: 1 - (breakdown.overdueTaskRatio ?? 0) },
              { label: 'CI Success', value: breakdown.ciSuccessRate ?? 0 },
              { label: 'Commit Activity', value: breakdown.commitActivity ?? 0 },
              { label: 'Blockers', value: 1 - (breakdown.blockedTaskRatio ?? 0) },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center gap-2">
                <div className="w-28 text-xs text-muted-foreground">{metric.label}</div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40">
                  <div
                    className={`h-full ${getMetricBarClass(metric.value)}`}
                    style={{ width: `${Math.max(0, Math.min(100, metric.value * 100))}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs text-foreground">{Math.round(metric.value * 100)}%</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
