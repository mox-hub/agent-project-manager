import { Activity, ArrowUpRight, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { HealthDetailMetric } from '../../api/project-api';

interface ProjectHealthScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  trend30d: number;
  details: HealthDetailMetric[];
  lastEvaluatedAt?: string | null;
  onRefresh: () => void;
  onShare: () => void;
}

function getScoreLabel(score: number) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'At Risk';
  return 'Needs Attention';
}

function getMetricStatusLabel(status: HealthDetailMetric['status']) {
  if (status === 'on_track') return 'On track';
  if (status === 'stable') return 'Stable';
  if (status === 'high') return 'High';
  if (status === 'pending') return '待接入';
  return 'Action needed';
}

function getProgressColor(status: HealthDetailMetric['status']) {
  if (status === 'on_track') return 'bg-status-on-track';
  if (status === 'stable') return 'bg-accent-blue';
  if (status === 'high') return 'bg-accent-yellow';
  if (status === 'pending') return 'bg-muted-foreground';
  return 'bg-status-off-track';
}

export function ProjectHealthScoreDialog({
  open,
  onOpenChange,
  score,
  trend30d,
  details,
  lastEvaluatedAt,
  onRefresh,
  onShare,
}: ProjectHealthScoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles size={18} className="text-accent-blue" />
                Project Health Score
              </DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Last updated: {lastEvaluatedAt ? new Date(lastEvaluatedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
              ×
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 p-5">
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="flex items-end gap-4">
              <p className="text-5xl font-bold text-foreground">{score}</p>
              <div className="pb-1">
                <p className="text-base font-semibold text-foreground">{getScoreLabel(score)}</p>
                <p className="text-sm text-muted-foreground">
                  Overall trend {trend30d >= 0 ? '+' : ''}
                  {trend30d} in last 30 days
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {details.map((metric) => (
              <div key={metric.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="inline-flex items-center gap-2 font-medium text-foreground">
                    <Activity size={14} className="text-muted-foreground" />
                    {metric.label}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{metric.available ? `${metric.score}/100` : '--'}</p>
                    <p className="text-xs text-muted-foreground">{getMetricStatusLabel(metric.status)}</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border/40">
                  <div
                    className={`h-full ${getProgressColor(metric.status)}`}
                    style={{ width: `${metric.available ? metric.score : 0}%` }}
                  />
                </div>
                {!metric.available ? (
                  <p className="text-xs text-accent-yellow">数据源待接入（{metric.source}）</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-border bg-background p-4 sm:justify-between">
          <Button variant="ghost" className="justify-start text-muted-foreground">
            <ArrowUpRight size={14} />
            View detailed report
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onShare}>
              <Share2 size={14} />
              Share
            </Button>
            <Button onClick={onRefresh}>Re-evaluate</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
