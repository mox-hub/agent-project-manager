import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HealthDetailMetric } from '../../api/project-api';

interface HealthScoreCardProps {
  score: number;
  trend30d: number;
  details?: HealthDetailMetric[];
  onOpenDetails: () => void;
}

function getHealthTone(score: number) {
  if (score >= 85) return 'text-status-on-track';
  if (score >= 70) return 'text-accent-blue';
  if (score >= 50) return 'text-accent-yellow';
  return 'text-status-off-track';
}

function getHealthLabel(score: number) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'At Risk';
  return 'Critical';
}

export function HealthScoreCard({
  score,
  trend30d,
  details = [],
  onOpenDetails,
}: HealthScoreCardProps) {
  const pendingCount = details.filter((item) => !item.available).length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Project Health</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Overall health score based on delivery and risk metrics
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getHealthTone(score)}`}>{score}</div>
            <Badge variant="secondary" className="mt-1">
              {getHealthLabel(score)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">30d Change</span>
          <span className={trend30d >= 0 ? 'text-status-on-track' : 'text-status-off-track'}>
            {trend30d >= 0 ? '+' : ''}
            {trend30d}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Metrics</span>
          <span className="text-foreground">{details.length || 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pending Integrations</span>
          <span className={pendingCount > 0 ? 'text-accent-yellow' : 'text-status-on-track'}>
            {pendingCount}
          </span>
        </div>
        <Button variant="outline" className="w-full" onClick={onOpenDetails}>
          查看评分详情
        </Button>
      </CardContent>
    </Card>
  );
}

