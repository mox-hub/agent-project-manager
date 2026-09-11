import { useDocumentDetail } from '@/modules/document/hooks/use-document-detail';
import { useTranslation } from '@/hooks/useTranslation';
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

function humanize(value?: string | null): string {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function DocumentPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: doc, isLoading, isError } = useDocumentDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={4} />;
  if (isError || !doc) return <PreviewBodyError />;

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：文档状态 + 分类 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <StatusPill tone={getStatusTone(doc.status)}>
            {humanize(doc.status)}
          </StatusPill>
          {doc.category && (
            <span className="text-10 font-medium text-muted-foreground">
              {humanize(doc.category)}
            </span>
          )}
        </div>
        {doc.wordCount != null && (
          <span className="text-10 font-mono text-muted-foreground">{doc.wordCount} 字</span>
        )}
      </div>

      {doc.summary && <p className="line-clamp-2 text-11 text-muted-foreground">{doc.summary}</p>}

      <PreviewSection title="文档属性">
        <PreviewRow label={t('routePreview.document.folder')}>
          {doc.folder?.name ?? '—'}
        </PreviewRow>
        <PreviewRow label={t('routePreview.document.words')}>{doc.wordCount ?? 0} 字</PreviewRow>
      </PreviewSection>

      <PreviewFooterMeta>
        <span>更新于 {formatPreviewDateTime(doc.updatedAt)}</span>
        <span className="ml-auto font-mono text-10">{doc.id.slice(0, 8)}</span>
      </PreviewFooterMeta>
    </div>
  );
}
