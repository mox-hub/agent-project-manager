import { useProjectHealthSnapshots } from '../hooks/use-project-health';
import { useTheme } from '@/shared/theme/theme-context';

interface ProjectHealthWidgetProps {
  projectId: string;
  compact?: boolean;
}

export function ProjectHealthWidget({ projectId, compact = false }: ProjectHealthWidgetProps) {
  const { theme } = useTheme();
  const { colors, spacing, typography } = theme;

  const { data: snapshots, isLoading } = useProjectHealthSnapshots(projectId, 30);

  if (isLoading) {
    return (
      <div style={{ padding: spacing.md, color: colors.content.textSecondary }}>
        Loading health data...
      </div>
    );
  }

  const currentScore = snapshots?.[snapshots.length - 1]?.healthScore ?? 0;
  const previousScore = snapshots?.length > 1 ? snapshots[snapshots.length - 2]?.healthScore : currentScore;
  const scoreChange = currentScore - previousScore;

  const getHealthColor = (score: number) => {
    if (score >= 80) return colors.status.onTrack;
    if (score >= 60) return colors.status.atRisk;
    if (score >= 40) return colors.status.priorityHigh;
    return colors.status.offTrack;
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'At Risk';
    return 'Critical';
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.sm,
          backgroundColor: getHealthColor(currentScore) + '15',
          borderRadius: 8,
          border: `1px solid ${getHealthColor(currentScore)}30`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: getHealthColor(currentScore),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: typography.fontSize.md,
          }}
        >
          {currentScore}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: typography.fontSize.sm }}>{getHealthLabel(currentScore)}</div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: scoreChange >= 0 ? colors.status.onTrack : colors.status.offTrack,
            }}
          >
            {scoreChange >= 0 ? '↑' : '↓'} {Math.abs(scoreChange)} pts vs last week
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: spacing.lg,
        backgroundColor: colors.content.bgSecondary,
        borderRadius: 12,
        border: `1px solid ${colors.content.borderLight}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.fontSize.md, fontWeight: 600 }}>Project Health</h3>
          <p style={{ margin: '4px 0 0', fontSize: typography.fontSize.sm, color: colors.content.textSecondary }}>
            Overall health score based on multiple factors
          </p>
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: getHealthColor(currentScore),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '20px',
          }}
        >
          {currentScore}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.content.textSecondary }}>Status</div>
          <div style={{ fontWeight: 600, color: getHealthColor(currentScore) }}>{getHealthLabel(currentScore)}</div>
        </div>
        <div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.content.textSecondary }}>Change (30d)</div>
          <div style={{ fontWeight: 600, color: scoreChange >= 0 ? colors.status.onTrack : colors.status.offTrack }}>
            {scoreChange >= 0 ? '+' : ''}{scoreChange} pts
          </div>
        </div>
      </div>

      {snapshots && snapshots.length > 0 && (
        <div>
          <div style={{ fontSize: typography.fontSize.sm, fontWeight: 500, marginBottom: spacing.sm }}>
            Health Breakdown
          </div>
          {(() => {
            const latest = snapshots[snapshots.length - 1];
            const breakdown = latest?.breakdown;
            if (!breakdown) return null;

            const metrics = [
              { label: 'Iteration Completion', value: breakdown.iterationCompletionRate, key: 'iterationCompletionRate' },
              { label: 'Task Overdue', value: 1 - breakdown.overdueTaskRatio, key: 'overdueTaskRatio' },
              { label: 'CI Success', value: breakdown.ciSuccessRate, key: 'ciSuccessRate' },
              { label: 'Commit Activity', value: breakdown.commitActivity, key: 'commitActivity' },
              { label: 'Blockers', value: 1 - breakdown.blockedTaskRatio, key: 'blockedTaskRatio' },
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {metrics.map((metric) => (
                  <div key={metric.key} style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <div style={{ width: 120, fontSize: typography.fontSize.xs, color: colors.content.textSecondary }}>
                      {metric.label}
                    </div>
                    <div style={{ flex: 1, height: 6, backgroundColor: colors.content.borderLight, borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(metric.value ?? 0) * 100}%`,
                          height: '100%',
                          backgroundColor: (metric.value ?? 0) >= 0.8 ? colors.status.onTrack : (metric.value ?? 0) >= 0.5 ? '#f59e0b' : colors.status.offTrack,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <div style={{ width: 40, fontSize: typography.fontSize.xs, textAlign: 'right' }}>
                      {Math.round((metric.value ?? 0) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
