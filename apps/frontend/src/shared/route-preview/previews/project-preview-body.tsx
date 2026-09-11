import { Progress } from '@/components/ui/progress';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useTranslation } from '@/hooks/useTranslation';
import { StatusPill } from '@/components/ui/status-pill';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
  formatPreviewDate,
  getStatusTone,
} from './preview-fields';

function humanize(value?: string | null): string {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function ProjectPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: project, isLoading, isError } = useProjectDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={4} />;
  if (isError || !project) return <PreviewBodyError />;

  const statusLabel = project.healthStatus
    ? humanize(project.healthStatus)
    : humanize(project.status);

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：健康度 + 交付进度 */}
      <div className="space-y-1.5 pb-1 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusPill tone={getStatusTone(project.healthStatus ?? project.status)}>
              {statusLabel}
            </StatusPill>
            {typeof project.healthScore === 'number' && (
              <span className="text-11 font-medium text-foreground">
                健康度 {project.healthScore} 分
              </span>
            )}
          </div>
          {typeof project._count?.tasks === 'number' && (
            <span className="text-10 font-mono text-muted-foreground">
              {project._count.tasks} 项工单
            </span>
          )}
        </div>
        {typeof project.progress === 'number' && (
          <div className="flex items-center gap-2">
            <Progress value={project.progress} className="h-1.5 flex-1" />
            <span className="font-mono text-10 text-muted-foreground">{project.progress}%</span>
          </div>
        )}
      </div>

      {project.description && (
        <p className="line-clamp-2 text-11 text-muted-foreground">{project.description}</p>
      )}

      <PreviewSection title="项目大盘">
        <PreviewRow label={t('routePreview.project.tasks')}>
          {project._count?.tasks ?? 0} 项
        </PreviewRow>
        <PreviewRow label={t('routePreview.project.members')}>
          {project.members?.length ?? 0} 位
        </PreviewRow>
        <PreviewRow label={t('routePreview.owner')}>
          {project.owner?.displayName ?? '—'}
        </PreviewRow>
        {project.targetDate && (
          <PreviewRow label={t('routePreview.targetDate')}>
            {formatPreviewDate(project.targetDate)}
          </PreviewRow>
        )}
      </PreviewSection>

      <PreviewFooterMeta>
        <span>负责人: {project.owner?.displayName ?? '—'}</span>
        {project.targetDate && (
          <span className="ml-auto font-mono text-10">
            目标: {formatPreviewDate(project.targetDate)}
          </span>
        )}
      </PreviewFooterMeta>
    </div>
  );
}
