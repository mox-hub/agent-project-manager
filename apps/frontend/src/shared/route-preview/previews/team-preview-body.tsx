import { useTeamDetail } from '@/modules/team-member/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import { StatusPill } from '@/components/ui/status-pill';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
  getStatusTone,
} from './preview-fields';

function humanize(value?: string | null): string {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function TeamPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: team, isLoading, isError } = useTeamDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !team) return <PreviewBodyError />;

  const memberCount = team._count?.members ?? team.memberCount ?? 0;
  const projectCount = team._count?.projects ?? 0;

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：团队状态 + 规模 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
        <StatusPill tone={getStatusTone(team.status)}>
          {humanize(team.status)}
        </StatusPill>
        <span className="text-10 font-mono text-muted-foreground">
          {memberCount} 位成员
        </span>
      </div>

      {team.description && (
        <p className="line-clamp-2 text-11 text-muted-foreground">{team.description}</p>
      )}

      <PreviewSection title="团队概况">
        <PreviewRow label={t('routePreview.team.members')}>
          {memberCount} 位
        </PreviewRow>
        <PreviewRow label={t('routePreview.team.projects')}>
          {projectCount} 个
        </PreviewRow>
      </PreviewSection>

      <PreviewFooterMeta>
        <span>团队规模: {memberCount} 人</span>
        <span className="ml-auto font-mono text-10">{team.id.slice(0, 8)}</span>
      </PreviewFooterMeta>
    </div>
  );
}
