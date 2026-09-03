/**
 * 文档详情预览卡片 body
 * 数据：['documents', 'detail', id]
 */

import { useDocumentDetail } from '@/modules/document/hooks/use-document-detail';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewRow,
  StatusPreviewBadge,
  formatPreviewDateTime,
} from './preview-fields';

export function DocumentPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: doc, isLoading, isError } = useDocumentDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={4} />;
  if (isError || !doc) return <PreviewBodyError />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <StatusPreviewBadge status={doc.status} />
        <StatusPreviewBadge status={doc.category} namespace="category" />
      </div>

      {doc.summary && <p className="line-clamp-2 text-11 text-muted-foreground">{doc.summary}</p>}

      <div className="flex flex-col gap-1.5">
        <PreviewRow label={t('routePreview.document.folder')}>
          {doc.folder?.name ?? '—'}
        </PreviewRow>
        <PreviewRow label={t('routePreview.document.words')}>{doc.wordCount}</PreviewRow>
        <PreviewRow label={t('routePreview.updatedAt')}>
          {formatPreviewDateTime(doc.updatedAt)}
        </PreviewRow>
      </div>
    </div>
  );
}
