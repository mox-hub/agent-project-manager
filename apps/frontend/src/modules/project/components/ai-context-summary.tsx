import { cn } from '@/lib/utils';

export interface ProjectAIContextData {
  techStack?: string[] | null;
  languages?: string[] | null;
  frameworks?: string[] | null;
  lifecyclePhase?: string | null;
  complexityLevel?: string | null;
  teamSizeCategory?: string | null;
  healthScore?: number | null;
  riskIndicators?: {
    overdueTaskRatio?: number;
    blockedTaskCount?: number;
    velocityTrend?: string;
    ciFailureRate?: number;
  } | null;
}

export interface AiContextSummaryProps {
  context: ProjectAIContextData;
  compact?: boolean;
}

export function AiContextSummary({ context, compact }: AiContextSummaryProps) {
  const chips = [
    ...(context.techStack ?? []),
    ...(context.frameworks ?? []),
  ].slice(0, compact ? 4 : 8);

  const metaItems = [
    context.lifecyclePhase && { label: 'Phase', value: context.lifecyclePhase },
    context.complexityLevel && { label: 'Complexity', value: context.complexityLevel },
    context.teamSizeCategory && { label: 'Team', value: context.teamSizeCategory },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-3">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {metaItems.length > 0 && (
        <div className={cn('flex flex-wrap gap-x-4 gap-y-1', compact && 'gap-x-3')}>
          {metaItems.map((item) => (
            <div key={item.label}>
              <span className="text-xs text-muted-foreground">{item.label}: </span>
              <span className="text-xs font-medium capitalize text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {context.healthScore != null && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Health</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                context.healthScore >= 80
                  ? 'bg-accent-green'
                  : context.healthScore >= 60
                    ? 'bg-accent-yellow'
                    : 'bg-accent-red',
              )}
              style={{ width: `${context.healthScore}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-foreground">{context.healthScore}</span>
        </div>
      )}
    </div>
  );
}
