import { ShieldCheck, Clock } from 'lucide-react';
import { useAcceptanceDetail } from '@/modules/acceptance/hooks/use-acceptance';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/status-pill';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
  formatPreviewDateTime,
  getStatusTone,
} from './preview-fields';

export function AcceptancePreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: acceptance, isLoading, isError } = useAcceptanceDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !acceptance) return <PreviewBodyError />;

  const total = acceptance.criteria?.length ?? 0;
  const passed = acceptance.criteria?.filter((c) => c.status === 'passed').length ?? 0;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：门禁通过率点阵 + 状态 */}
      <div className="space-y-1.5 p-2 rounded-md bg-accent-green/10 border border-accent-green/30">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-accent-green flex items-center gap-1 text-10">
            <ShieldCheck className="size-3.5" /> 门禁通过率: {passed}/{total > 0 ? total : '—'} Passed
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-10 font-bold text-accent-green">{pct}%</span>
            <StatusPill tone={getStatusTone(acceptance.status)}>
              {acceptance.status}
            </StatusPill>
          </div>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-1">
            {acceptance.criteria?.slice(0, 6).map((c, idx) => (
              <span
                key={c.id || idx}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  c.status === 'passed'
                    ? 'bg-accent-green'
                    : c.status === 'failed' || c.status === 'blocked'
                      ? 'bg-accent-red'
                      : 'bg-accent-yellow animate-pulse',
                )}
                title={`${c.content}: ${c.status}`}
              />
            ))}
          </div>
        )}
      </div>

      <PreviewSection title="证据回流与治理">
        <PreviewRow label={t('routePreview.acceptance.task')}>
          {acceptance.task?.title ?? acceptance.issueId}
        </PreviewRow>
        {acceptance.completionType && (
          <PreviewRow label="闭环类型">
            <span className="text-10 font-mono text-muted-foreground">{acceptance.completionType}</span>
          </PreviewRow>
        )}
        {acceptance.auditReport?.riskLevel && (
          <PreviewRow label="审计风险等级">
            <span
              className={cn(
                'font-semibold uppercase text-10',
                acceptance.auditReport.riskLevel === 'red'
                  ? 'text-accent-red'
                  : acceptance.auditReport.riskLevel === 'yellow'
                    ? 'text-accent-yellow'
                    : 'text-accent-green',
              )}
            >
              {acceptance.auditReport.riskLevel}
            </span>
          </PreviewRow>
        )}
      </PreviewSection>

      <PreviewFooterMeta>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatPreviewDateTime(acceptance.updatedAt ?? acceptance.createdAt)}
        </span>
        <span className="ml-auto font-mono text-10">{acceptance.id.slice(0, 8)}</span>
      </PreviewFooterMeta>
    </div>
  );
}
