/**
 * Git 仓库详情预览卡片 body
 * 数据：['repository', id]
 */

import { useRepository } from '@/modules/git/hooks/use-repositories';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewRow,
  formatPreviewDateTime,
} from './preview-fields';

export function RepositoryPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: repo, isLoading, isError } = useRepository(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !repo) return <PreviewBodyError />;

  return (
    <div className="flex flex-col gap-1.5">
      <PreviewRow label={t('routePreview.repository.project')}>
        {repo.project?.name ?? '—'}
      </PreviewRow>
      <PreviewRow label={t('routePreview.repository.branch')}>
        {repo.defaultBranch ?? '—'}
      </PreviewRow>
      {repo.remoteUrl && (
        <PreviewRow label={t('routePreview.repository.remote')}>{repo.remoteUrl}</PreviewRow>
      )}
      <PreviewRow label={t('routePreview.updatedAt')}>{formatPreviewDateTime(repo.updatedAt)}</PreviewRow>
    </div>
  );
}
