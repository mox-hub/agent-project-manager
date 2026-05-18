import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiContextSummary, type ProjectAIContextData } from '@/shared/components/ai-context-summary';
import type { AiDetailBreakdown } from '../../api/project-api';

interface AiInsightCardProps {
  score: number;
  complexity: string | null;
  lifecycle: string | null;
  teamSize: string | null;
  summary: string | null;
  details?: AiDetailBreakdown;
  /** Full AI context with tech stack, risk indicators etc. */
  aiContext?: ProjectAIContextData | null;
  lastComputedAt: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export function AiInsightCard({
  score,
  complexity,
  lifecycle,
  teamSize,
  summary,
  details,
  aiContext,
  lastComputedAt,
  isRefreshing,
  onRefresh,
}: AiInsightCardProps) {
  const riskTop = [...(details?.riskBreakdown ?? [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // Build context data from available sources
  const contextData: ProjectAIContextData = {
    techStack: aiContext?.techStack ?? null,
    frameworks: aiContext?.frameworks ?? null,
    lifecyclePhase: lifecycle,
    complexityLevel: complexity,
    teamSizeCategory: teamSize,
    healthScore: score,
    riskIndicators: aiContext?.riskIndicators ?? null,
  };

  return (
    <Card className="border-accent-purple/30 bg-accent-purple-light/5">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-purple" />
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
          </div>
          <Button size="xs" variant="ghost" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* AI Context Summary — tech stack chips, meta, health gauge */}
        <AiContextSummary context={contextData} compact />

        {/* Risk breakdown */}
        {riskTop.length > 0 && (
          <div className="rounded-lg bg-background p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top Risks
            </p>
            <div className="space-y-2">
              {riskTop.map((risk) => (
                <div key={risk.key} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-xs text-muted-foreground truncate">{risk.label}</span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        risk.value >= 60 ? 'bg-accent-red' : risk.value >= 30 ? 'bg-accent-yellow' : 'bg-accent-green',
                      )}
                      style={{ width: `${Math.min(risk.value, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums text-foreground w-8 text-right">{risk.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary text */}
        {summary && (
          <p className="text-xs leading-5 text-muted-foreground italic">
            "{summary.length > 160 ? `${summary.slice(0, 160)}...` : summary}"
          </p>
        )}

        {/* Last computed */}
        <p className="text-xs text-muted-foreground/70">
          Last computed: {formatDate(lastComputedAt)}
        </p>
      </CardContent>
    </Card>
  );
}
