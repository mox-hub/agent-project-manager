/**
 * AuditReportPanel — 完整性审计报告面板
 * 消费服务端 AuditReport（riskLevel/blockedItems/suggestedItems/passedItems），
 * 建议/阻断项支持采纳（onApplySuggestions 回调，由页面接 mutation）。
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AuditReport, AuditItem } from '../api/acceptance-api';

interface Props {
  report: AuditReport;
  onApplySuggestions?: (itemIds: string[]) => void;
  loading?: boolean;
}

const RISK_STYLE: Record<string, string> = {
  red: 'border-accent-red/40 bg-accent-red/10 text-accent-red',
  yellow: 'border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow',
  green: 'border-accent-green/40 bg-accent-green/10 text-accent-green',
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'text-accent-red border-accent-red/40',
  high: 'text-accent-yellow border-accent-yellow/30',
  medium: 'text-muted-foreground border-border',
  low: 'text-muted-foreground border-border',
};

export function AuditReportPanel({ report, onApplySuggestions, loading }: Props) {
  const { t } = useTranslation();
  const blocked = report.blockedItems ?? [];
  const suggested = report.suggestedItems ?? [];
  const passed = report.passedItems ?? [];
  const riskLabel = t(`acceptance.risk.${report.riskLevel ?? 'none'}`);

  return (
    <div className="space-y-4">
      {/* 风险级别 + 清单 + 上次审计时间 */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className={`px-3 py-1 ${RISK_STYLE[report.riskLevel] ?? ''}`}>
          {riskLabel}
        </Badge>
        {report.checklist && (
          <span className="text-sm text-muted-foreground">
            {t('acceptanceDetail.audit.checklist')}: {report.checklist.name}
          </span>
        )}
        {report.auditDate && (
          <span className="text-xs text-muted-foreground">
            {t('acceptanceDetail.audit.lastRun')}: {new Date(report.auditDate).toLocaleString()}
          </span>
        )}
      </div>

      {/* 摘要 */}
      {report.summary && typeof report.summary === 'string' && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">{report.summary}</div>
      )}

      {/* 强阻断项 */}
      {blocked.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-accent-red">
            <span className="size-2 rounded-full bg-accent-red" />
            {t('acceptanceDetail.audit.blocked')}
            <span className="text-xs font-normal text-muted-foreground">
              {t('acceptanceDetail.audit.blockedDesc')}
            </span>
          </h4>
          <div className="space-y-2">
            {blocked.map((item) => (
              <AuditItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* 建议补全项 */}
      {suggested.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-accent-yellow">
            <span className="size-2 rounded-full bg-accent-yellow" />
            {t('acceptanceDetail.audit.suggested')}
          </h4>
          <div className="space-y-2">
            {suggested.map((item) => (
              <AuditItemCard
                key={item.id}
                item={item}
                showApply={!!onApplySuggestions}
                onApply={() => onApplySuggestions?.([item.id])}
                loading={loading}
              />
            ))}
          </div>
          {onApplySuggestions && suggested.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplySuggestions(suggested.map((i) => i.id))}
              disabled={loading}
              className="mt-2"
            >
              {t('acceptanceDetail.audit.applyAll', { count: suggested.length })}
            </Button>
          )}
        </div>
      )}

      {/* 已通过检查 */}
      {passed.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-accent-green">
            <span className="size-2 rounded-full bg-accent-green" />
            {t('acceptanceDetail.audit.passed')}
          </h4>
          <div className="space-y-1">
            {passed.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded bg-accent-green/10 p-2 text-sm"
              >
                <span className="text-accent-green">✓</span>
                <span className="flex-1">{item.content}</span>
                {item.category && (
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AuditItemCardProps {
  item: AuditItem;
  showApply?: boolean;
  onApply?: () => void;
  loading?: boolean;
}

function AuditItemCard({ item, showApply, onApply, loading }: AuditItemCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{item.content}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-xs ${SEVERITY_STYLE[item.severity] ?? ''}`}>
              {t(`acceptance.severity.${item.severity}`, item.severity)}
            </Badge>
            {item.category && (
              <Badge variant="secondary" className="text-xs">
                {item.category}
              </Badge>
            )}
            {item.source && (
              <span className="text-xs text-muted-foreground">{item.source}</span>
            )}
          </div>
          {item.suggestion && (
            <p className="mt-1 text-xs text-muted-foreground">{item.suggestion}</p>
          )}
        </div>
        {showApply && onApply && (
          <Button variant="ghost" size="sm" onClick={onApply} disabled={loading} className="text-xs">
            {t('acceptanceDetail.audit.apply')}
          </Button>
        )}
      </div>
    </div>
  );
}
