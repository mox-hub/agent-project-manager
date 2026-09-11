/**
 * 成员详情预览卡片 body（富信息模板示范，B-2）
 *
 * 数据：['member', id]（useMemberDetail 现成缓存，不新增接口调用）。
 * 信息密度对齐 team-member 的 MemberCardPopover（点击式成员卡）：
 * 资料（handle/职务/信任）+ AI 配置（模型/思考强度，仅 AI 成员）+ 标签 + 底部元信息，
 * 宽度仍由 RoutePreviewTrigger 的 w-72 承载，不横向膨胀。
 */
import { Clock } from 'lucide-react';
import { useMemberDetail } from '@/modules/team-member/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import {
  MEMBER_THINKING_LEVELS,
  MEMBER_TRUST_LEVEL_LABELS,
} from '@/shared/member/types';
import { TONE_DOT_CLASS, type StatusTone } from '@/shared/status/status-visuals';
import { cn } from '@/lib/utils';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
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

// 新增文案的 i18n 键留待 locale 解冻批次补齐（本批次禁改 locale JSON），
// 先以调用处常量承载；routePreview.member.* 既有键照常用 t()。
const LABEL_PROFILE = '资料';
const LABEL_AI = 'AI 配置';
const LABEL_TRUST = '信任';
const LABEL_MODEL = '模型';
const LABEL_THINKING = '思考强度';
const LABEL_LAST_ACTIVE = '最近活跃';

/** member.status → 状态点语义 tone（对齐 MemberCardPopover 的 STATUS_DOT 口径） */
const MEMBER_STATUS_TONE: Record<string, StatusTone> = {
  active: 'success',
  suspended: 'warning',
};

export function MemberPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: member, isLoading, isError } = useMemberDetail(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !member) return <PreviewBodyError />;

  const isAi = member.type === 'ai_agent';
  const trustLabel =
    member.trustLevel != null
      ? MEMBER_TRUST_LEVEL_LABELS[member.trustLevel] ?? `L${member.trustLevel}`
      : null;
  const thinkingLabel = member.thinkingLevel
    ? MEMBER_THINKING_LEVELS.find((l) => l.value === member.thinkingLevel)?.label ??
      member.thinkingLevel
    : null;
  const statusTone = MEMBER_STATUS_TONE[member.status] ?? 'default';

  return (
    <div className="space-y-3">
      {/* 顶部成员身份带：Avatar + Name + Status */}
      <div className="flex items-start gap-2.5 pb-1 border-b border-border/50">
        <MemberAvatar
          member={member}
          size="md"
          showBadge={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-semibold text-foreground">
              {member.displayName}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-10 font-medium">
              <span className={cn('size-1.5 rounded-full', TONE_DOT_CLASS[statusTone])} />
              <span className="text-muted-foreground">
                {member.isOnline ? t('routePreview.member.online') : member.status}
              </span>
            </span>
          </div>
          <p className="truncate text-11 text-muted-foreground">
            @{member.handle}
            {member.title ? ` · ${member.title}` : ''}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <StatusPill tone={getStatusTone(member.status)}>
              {member.isOnline ? 'Online' : member.status}
            </StatusPill>
            {isAi && <StatusPill tone="info">AI Agent</StatusPill>}
          </div>
        </div>
      </div>

      {member.bio && <p className="line-clamp-2 text-11 text-muted-foreground">{member.bio}</p>}

      <PreviewSection title={LABEL_PROFILE}>
        <PreviewRow label={t('routePreview.member.handle')}>{member.handle}</PreviewRow>
        <PreviewRow label={t('routePreview.member.title')}>{member.title ?? '—'}</PreviewRow>
        <PreviewRow label={LABEL_TRUST}>
          {trustLabel ?? '—'}
          {member.trustScore != null ? ` · ${member.trustScore}` : ''}
        </PreviewRow>
      </PreviewSection>

      {isAi && (member.aiModelConfig || thinkingLabel) && (
        <PreviewSection title={LABEL_AI}>
          {member.aiModelConfig && (
            <PreviewRow label={LABEL_MODEL}>
              {member.aiModelConfig.name} · {member.aiModelConfig.provider}
            </PreviewRow>
          )}
          {thinkingLabel && <PreviewRow label={LABEL_THINKING}>{thinkingLabel}</PreviewRow>}
        </PreviewSection>
      )}

      {member.tags && member.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-10 font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <PreviewFooterMeta>
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT_CLASS[statusTone])} />
        <span className="inline-flex min-w-0 items-center gap-1">
          <Clock className="size-2.5 shrink-0" aria-hidden />
          {LABEL_LAST_ACTIVE} {formatPreviewDateTime(member.lastActiveAt)}
        </span>
        <span className="ml-auto shrink-0 font-mono">{member.shortId}</span>
      </PreviewFooterMeta>
    </div>
  );
}
