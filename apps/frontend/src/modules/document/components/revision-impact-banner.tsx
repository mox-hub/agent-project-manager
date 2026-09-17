/**
 * 需求修订影响提示条（CAP-P-01 批一 P0 最小闭环）：
 * 文档详情页顶部状态提示——决策卡本身承载批阅（决策收件箱），
 * 这里只做状态可见性：待确认 / 已标记待复核 / 已不处理。
 */
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, GitCompareArrows, Info } from 'lucide-react';
import { useRevisionImpact } from '../hooks/use-revision-impact';

export function RevisionImpactBanner({
  documentId,
  category,
}: {
  documentId: string;
  category?: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useRevisionImpact(documentId, category);

  if (isLoading || !data || data.status === 'none') return null;

  if (data.status === 'pending_decision') {
    return (
      <div
        className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-accent-yellow/40 bg-accent-yellow-light/30 px-4 py-3 text-sm"
        data-ai-component="document.document-view.revision-impact-pending"
      >
        <GitCompareArrows size={15} className="shrink-0 text-accent-yellow" />
        <span className="text-foreground">
          {t('document.revisionImpact.pending', {
            issues: data.issueCount ?? 0,
            criteria: data.criteriaCount ?? 0,
          })}
        </span>
        <a
          href="/app/decisions"
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-accent-yellow hover:underline"
        >
          {t('document.revisionImpact.goInbox')}
          <ArrowRight size={12} />
        </a>
      </div>
    );
  }

  if (data.status === 'applied') {
    return (
      <div
        className="mb-4 flex items-center gap-2 rounded-lg border border-accent-green/40 bg-accent-green-light/30 px-4 py-3 text-sm"
        data-ai-component="document.document-view.revision-impact-applied"
      >
        <CheckCircle2 size={15} className="shrink-0 text-accent-green" />
        <span className="text-foreground">
          {t('document.revisionImpact.applied', {
            count: data.appliedCount ?? 0,
          })}
        </span>
      </div>
    );
  }

  // dismissed：知悉/驳回留痕，弱提示
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      <Info size={13} className="shrink-0" />
      <span>{t('document.revisionImpact.dismissed')}</span>
    </div>
  );
}
