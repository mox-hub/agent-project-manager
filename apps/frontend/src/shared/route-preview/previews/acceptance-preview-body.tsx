/**
 * 验收记录详情预览卡片 body
 * 数据：['acceptance', 'detail', id]
 */

import { useAcceptanceDetail } from '@/modules/acceptance/hooks/use-acceptance';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewRow,
  StatusPreviewBadge,
  formatPreviewDateTime,
} from './preview-fields';

export function AcceptancePreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: acceptance, isLoading, isError } = useAcceptanceDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !acceptance) return <PreviewBodyError />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <StatusPreviewBadge status={acceptance.status} />
      </div>

      <div className="flex flex-col gap-1.5">
        <PreviewRow label={t('routePreview.acceptance.task')}>
          {acceptance.task?.title ?? acceptance.taskId}
        </PreviewRow>
        <PreviewRow label={t('routePreview.updatedAt')}>
          {formatPreviewDateTime(acceptance.updatedAt ?? acceptance.createdAt)}
        </PreviewRow>
      </div>
    </div>
  );
}
