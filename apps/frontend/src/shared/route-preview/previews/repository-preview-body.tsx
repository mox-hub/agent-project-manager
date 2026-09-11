import { GitBranch } from 'lucide-react';
import { useRepository } from '@/modules/git/hooks/use-repositories';
import { useTranslation } from '@/hooks/useTranslation';
import { Badge } from '@/components/ui/badge';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
  formatPreviewDateTime,
} from './preview-fields';

export function RepositoryPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: repo, isLoading, isError } = useRepository(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !repo) return <PreviewBodyError />;

  const branch = repo.defaultBranch ?? 'main';

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：默认分支 + 项目 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
        <Badge variant="outline" className="text-10 font-mono">
          <GitBranch className="size-2.5 mr-1 text-accent-purple" />
          {branch}
        </Badge>
        {repo.project?.name && (
          <span className="text-10 font-medium text-muted-foreground truncate max-w-40">
            {repo.project.name}
          </span>
        )}
      </div>

      <PreviewSection title="仓库信息">
        <PreviewRow label={t('routePreview.repository.project')}>
          {repo.project?.name ?? '—'}
        </PreviewRow>
        <PreviewRow label={t('routePreview.repository.branch')}>
          {branch}
        </PreviewRow>
        {repo.remoteUrl && (
          <PreviewRow label={t('routePreview.repository.remote')}>
            <span className="font-mono text-10 truncate max-w-40" title={repo.remoteUrl}>
              {repo.remoteUrl}
            </span>
          </PreviewRow>
        )}
      </PreviewSection>

      <PreviewFooterMeta>
        <span>更新于 {formatPreviewDateTime(repo.updatedAt)}</span>
        <span className="ml-auto font-mono text-10">{repo.id.slice(0, 8)}</span>
      </PreviewFooterMeta>
    </div>
  );
}
