/**
 * 执行 run 状态视觉共享件（执行记录页与发版前因后果链路共用）。
 *
 * 与 status-visuals.TASK_STATUS_VISUALS 的关系：这里是「执行 run 状态」（ExecutionRunStatus，
 * 含 pending_approval / blocked / superseded 等执行专属态），非「任务状态」，故保留独立映射；
 * 共有态里 in_progress 用 Clock+pulse（执行=有耗时的运行）而非任务态的 Loader2（进行中的活儿），
 * 属执行专属口径。收编到 status-visuals 需先为其扩「执行 run 状态」映射表。
 */
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/status-pill';

export const RUN_STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; pulse?: boolean }
> = {
  draft: { icon: Circle, color: 'text-muted-foreground' },
  planned: { icon: Circle, color: 'text-muted-foreground' },
  in_progress: { icon: Clock, color: 'text-accent-blue', pulse: true },
  pending_approval: { icon: AlertTriangle, color: 'text-accent-yellow' },
  completed: { icon: CheckCircle2, color: 'text-accent-green' },
  failed: { icon: XCircle, color: 'text-accent-red' },
  blocked: { icon: Ban, color: 'text-accent-red' },
  superseded: { icon: Circle, color: 'text-muted-foreground' },
};

const STATUS_PILL_TONE: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  planned: 'default',
  in_progress: 'info',
  pending_approval: 'warning',
  completed: 'success',
  failed: 'danger',
  blocked: 'danger',
  superseded: 'default',
};

export function RunStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  const cfg = RUN_STATUS_CONFIG[status] ?? RUN_STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <StatusPill tone={STATUS_PILL_TONE[status] ?? 'default'} className={cn('gap-1', className)}>
      <Icon className={cn('size-3', cfg.pulse && 'animate-pulse')} />
      {t(`runDetails.status.${status}`)}
    </StatusPill>
  );
}

export function formatRunDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
