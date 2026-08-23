/**
 * 成员详情预览卡片 body
 * 数据：['member', id]
 */

import { useMemberDetail } from '@/modules/team-member/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewRow,
  StatusPreviewBadge,
  formatPreviewDateTime,
} from './preview-fields';

export function MemberPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: member, isLoading, isError } = useMemberDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !member) return <PreviewBodyError />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <StatusPreviewBadge status={member.status} />
        {member.type === 'ai_agent' && (
          <StatusPreviewBadge status={member.type} namespace="memberType" />
        )}
        {member.isOnline && (
          <span className="text-11 text-muted-foreground">{t('routePreview.member.online')}</span>
        )}
      </div>

      {member.bio && <p className="line-clamp-2 text-11 text-muted-foreground">{member.bio}</p>}

      <div className="flex flex-col gap-1.5">
        <PreviewRow label={t('routePreview.member.handle')}>{member.handle}</PreviewRow>
        <PreviewRow label={t('routePreview.member.title')}>{member.title ?? '—'}</PreviewRow>
        <PreviewRow label={t('routePreview.member.lastActive')}>
          {formatPreviewDateTime(member.lastActiveAt)}
        </PreviewRow>
      </div>
    </div>
  );
}
