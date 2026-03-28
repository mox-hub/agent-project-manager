import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AiDetailBreakdown } from '../../api/project-api';

interface AiInsightCardProps {
  score: number;
  complexity: string | null;
  lifecycle: string | null;
  summary: string | null;
  details?: AiDetailBreakdown;
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
  summary,
  details,
  lastComputedAt,
  isRefreshing,
  onRefresh,
}: AiInsightCardProps) {
  const riskTop = [...(details?.riskBreakdown ?? [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">AI Insights</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              AI context and risk analysis for current project
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">AI Score</p>
            <p className="text-lg font-semibold text-foreground">{score}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Complexity</p>
            <p className="text-sm font-medium capitalize text-foreground">{complexity || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lifecycle</p>
            <p className="text-sm font-medium capitalize text-foreground">{lifecycle || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Updated</p>
            <p className="text-xs text-foreground">{formatDate(lastComputedAt)}</p>
          </div>
        </div>
        {riskTop.length > 0 ? (
          <div className="rounded-md bg-background p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top Risks
            </p>
            <div className="space-y-1 text-sm">
              {riskTop.map((risk) => (
                <div key={risk.key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{risk.label}</span>
                  <span className="font-medium text-foreground">{risk.value}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <p className="text-sm leading-6 text-muted-foreground">{summary || 'No AI summary yet.'}</p>
      </CardContent>
    </Card>
  );
}

