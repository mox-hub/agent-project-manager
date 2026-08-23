/**
 * 项目详情预览卡片 body
 * 数据：['project', id] 缓存优先，miss 时 hover 挂载静默补拉
 */

import { Progress } from '@/components/ui/progress';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewRow,
  StatusPreviewBadge,
  formatPreviewDate,
} from './preview-fields';

export function ProjectPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: project, isLoading, isError } = useProjectDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={4} />;
  if (isError || !project) return <PreviewBodyError />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <StatusPreviewBadge status={project.status} />
        {project.healthStatus && <StatusPreviewBadge status={project.healthStatus} />}
        {typeof project.healthScore === 'number' && (
          <span className="text-11 tabular-nums text-muted-foreground">
            {t('routePreview.project.healthScore')}: {project.healthScore}
          </span>
        )}
      </div>

      {project.description && (
        <p className="line-clamp-2 text-11 text-muted-foreground">{project.description}</p>
      )}

      {typeof project.progress === 'number' && (
        <div className="flex items-center gap-2">
          <Progress value={project.progress} className="min-w-0 flex-1" />
          <span className="shrink-0 text-11 tabular-nums text-muted-foreground">
            {project.progress}%
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <PreviewRow label={t('routePreview.project.tasks')}>
          {project._count?.tasks ?? 0}
        </PreviewRow>
        <PreviewRow label={t('routePreview.project.members')}>
          {project.members?.length ?? 0}
        </PreviewRow>
        <PreviewRow label={t('routePreview.owner')}>
          {project.owner?.displayName ?? '—'}
        </PreviewRow>
        <PreviewRow label={t('routePreview.targetDate')}>
          {formatPreviewDate(project.targetDate)}
        </PreviewRow>
      </div>
    </div>
  );
}
