import { useProjectAIContext, useRefreshAIContext } from '../hooks/use-project-health';
import { PillButton } from '@/components/ui/button';
import { useTheme } from '@/shared/theme/theme-context';

interface AIInsightsWidgetProps {
  projectId: string;
}

export function AIInsightsWidget({ projectId }: AIInsightsWidgetProps) {
  const { theme } = useTheme();
  const { colors, spacing, typography, radii } = theme;

  const { data: aiContext, isLoading } = useProjectAIContext(projectId);
  const refreshContext = useRefreshAIContext(projectId);

  if (isLoading) {
    return (
      <div style={{ padding: spacing.md, color: colors.content.textSecondary }}>
        Loading AI context...
      </div>
    );
  }

  if (!aiContext) {
    return (
      <div
        style={{
          padding: spacing.lg,
          backgroundColor: colors.content.bgSecondary,
          borderRadius: radii.lg,
          border: `1px solid ${colors.content.borderLight}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: typography.fontSize.md, fontWeight: 600 }}>AI Insights</h3>
            <p style={{ margin: '4px 0 0', fontSize: typography.fontSize.sm, color: colors.content.textSecondary }}>
              Project context for AI assistant
            </p>
          </div>
          <PillButton variant="secondary" size="sm" onClick={() => refreshContext.mutate()}>
            Generate
          </PillButton>
        </div>
        <div style={{ marginTop: spacing.md, color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
          No AI context available yet. Click "Generate" to create project context.
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.fontSize.md, fontWeight: 600 }}>AI Insights</h3>
          <p style={{ margin: '4px 0 0', fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
            Project context for AI assistant
          </p>
        </div>
        <PillButton variant="secondary" size="sm" onClick={() => refreshContext.mutate()} disabled={refreshContext.isPending}>
          {refreshContext.isPending ? 'Refreshing...' : 'Refresh'}
        </PillButton>
      </div>

      {/* Tech Stack */}
      {aiContext.techStack && aiContext.techStack.length > 0 && (
        <div style={{ marginBottom: spacing.md }}>
          <div style={{ fontSize: typography.fontSize.sm, fontWeight: 500, marginBottom: spacing.xs }}>Tech Stack</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
            {aiContext.techStack.map((tech) => (
              <span
                key={tech}
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: typography.fontSize.xs,
                  backgroundColor: colors.primary + '20',
                  color: colors.primary,
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Team & Lifecycle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.md }}>
        <div>
          <div style={{ fontSize: typography.fontSize.sm, fontWeight: 500, marginBottom: spacing.xs }}>Team Size</div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
            {aiContext.teamSizeCategory === 'solo' && 'Solo (1 developer)'}
            {aiContext.teamSizeCategory === 'small' && 'Small (2-5)'}
            {aiContext.teamSizeCategory === 'medium' && 'Medium (6-20)'}
            {aiContext.teamSizeCategory === 'large' && 'Large (20+)'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: typography.fontSize.sm, fontWeight: 500, marginBottom: spacing.xs }}>Lifecycle Phase</div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' }}>
            {aiContext.lifecyclePhase}
          </div>
        </div>
      </div>

      {/* Complexity & Auto Summary */}
      <div style={{ marginBottom: spacing.md }}>
        <div style={{ fontSize: typography.fontSize.sm, fontWeight: 500, marginBottom: spacing.xs }}>Complexity</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: typography.fontSize.xs,
              backgroundColor:
                aiContext.complexityLevel === 'low'
                  ? colors.success + '20'
                  : aiContext.complexityLevel === 'medium'
                  ? '#f59e0b' + '20'
                  : aiContext.complexityLevel === 'high'
                  ? '#f97316' + '20'
                  : colors.error + '20',
              color:
                aiContext.complexityLevel === 'low'
                  ? colors.success
                  : aiContext.complexityLevel === 'medium'
                  ? '#f59e0b'
                  : aiContext.complexityLevel === 'high'
                  ? '#f97316'
                  : colors.error,
            }}
          >
            {aiContext.complexityLevel?.toUpperCase() || 'N/A'}
          </span>
        </div>
      </div>

      {/* Auto Summary */}
      {aiContext.autoSummary && (
        <div>
          <div style={{ fontSize: typography.fontSize.sm, fontWeight: 500, marginBottom: spacing.xs }}>AI Summary</div>
          <div
            style={{
              padding: spacing.sm,
              backgroundColor: colors.surface,
              borderRadius: 6,
              fontSize: typography.fontSize.sm,
              color: colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {aiContext.autoSummary}
          </div>
        </div>
      )}

      {/* Last computed */}
      {aiContext.lastComputedAt && (
        <div style={{ marginTop: spacing.md, fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
          Last updated: {new Date(aiContext.lastComputedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
