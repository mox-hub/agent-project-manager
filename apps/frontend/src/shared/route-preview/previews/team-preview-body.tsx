/**
 * 团队详情预览卡片 body
 * 数据：['team', id]（getTeam 返回附带 members/projects 数组）
 */

import { useTeamDetail } from '@/modules/team-member/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewRow,
  StatusPreviewBadge,
} from './preview-fields';

export function TeamPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: team, isLoading, isError } = useTeamDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !team) return <PreviewBodyError />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <StatusPreviewBadge status={team.status} />
      </div>

      {team.description && (
        <p className="line-clamp-2 text-11 text-muted-foreground">{team.description}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <PreviewRow label={t('routePreview.team.members')}>
          {team._count?.members ?? team.memberCount ?? 0}
        </PreviewRow>
        <PreviewRow label={t('routePreview.team.projects')}>
          {team._count?.projects ?? 0}
        </PreviewRow>
      </div>
    </div>
  );
}
