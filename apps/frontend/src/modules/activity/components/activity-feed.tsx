/**
 * ActivityFeed - 动态时间线（图1 Linear 风格：事件行 + 评论卡交错 + 底部评论输入）
 *
 * 数据源 modules/activity（跨 task/bug/project 通用）；
 * 事件图标统一走 StatusIconFrame 底框形态。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { History } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import type { StatusTone } from '@/shared/status/status-visuals';
import type { ActivityEntityType, ActivityItem } from '../api/activity-api';
import { useActivities } from '../hooks/use-activity';
import {
  eventPhraseKey,
  fieldLabelKey,
  fieldValueLabelKey,
  getEventVisual,
  isCommentActivity,
  OPAQUE_VALUE_FIELDS,
  resolveActivityType,
} from '../activity-display';
import { ActivityComment } from './activity-comment';
import { CommentInput } from './comment-input';

export function ActivityFeed({
  entityType,
  entityId,
  className,
}: {
  entityType: ActivityEntityType;
  entityId: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { data: activities = [] } = useActivities(entityType, entityId);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-2">
        <History className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('activity.title')}
        </span>
        {activities.length > 0 && (
          <span className="text-10 text-muted-foreground/60">({activities.length})</span>
        )}
      </div>

      <div className="flex flex-col">
        {activities.map((activity) =>
          isCommentActivity(activity) ? (
            <ActivityComment
              key={activity.id}
              activity={activity}
              entityId={entityId}
              onReply={(authorName) => setReplyTo(authorName)}
            />
          ) : (
            <ActivityEventRow key={activity.id} activity={activity} />
          ),
        )}
      </div>

      <CommentInput
        entityType={entityType}
        entityId={entityId}
        replyTo={replyTo}
        onReplyConsumed={() => setReplyTo(null)}
        placeholder={t('activity.comment.placeholder')}
      />
    </div>
  );
}

// ===== 事件行 =====

function ActivityEventRow({ activity }: { activity: ActivityItem }) {
  const { t, i18n } = useTranslation();
  const visual = getEventVisual(activity);
  const actorName =
    activity.actor?.displayName || activity.actor?.username || t('activity.system');
  const relativeTime = formatDistanceToNow(new Date(activity.createdAt), {
    addSuffix: true,
    locale: i18n.language === 'zh-CN' ? zhCN : undefined,
  });

  const changes = activity.changes ?? [];
  const phraseKey = eventPhraseKey(activity);
  const phrase =
    phraseKey === 'activity.event.generic'
      ? (activity.summary ?? t(phraseKey))
      : t(phraseKey, { entity: t(`activity.entity.${activity.entityType}`) });

  return (
    <div className="flex gap-2.5 py-1">
      <div className="flex flex-col items-center">
        <EventIcon icon={visual.icon} tone={visual.tone} spin={visual.spin} />
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pt-0.5 text-sm leading-relaxed">
        <span className="font-medium">{actorName}</span>
        <span className="text-muted-foreground">
          {phrase}
          {resolveActivityType(activity) === 'ai_execution' && activity.summary && (
            <span className="text-muted-foreground"> · {activity.summary}</span>
          )}
        </span>
        {changes.slice(0, 6).map((change, index) => (
          <ChangeChip
            key={`${change.field}-${index}`}
            field={change.field}
            oldValue={change.oldValue ?? null}
            newValue={change.newValue ?? null}
            entityType={activity.entityType as ActivityEntityType}
          />
        ))}
        <span className="ml-auto whitespace-nowrap text-11 text-muted-foreground/60">
          {relativeTime}
        </span>
      </div>
    </div>
  );
}

function EventIcon({
  icon: Icon,
  tone,
  spin,
}: {
  icon: LucideIcon;
  tone: StatusTone;
  spin?: boolean;
}) {
  return <StatusIconFrame icon={Icon} tone={tone} size="sm" spin={spin} className="mt-1" />;
}

function ChangeChip({
  field,
  oldValue,
  newValue,
  entityType,
}: {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  entityType: ActivityEntityType;
}) {
  const { t } = useTranslation();
  const label = t(fieldLabelKey(field));
  const opaque = OPAQUE_VALUE_FIELDS.has(field);

  const renderValue = (value: string | null) => {
    if (opaque || value === null) return null;
    const labelKey = fieldValueLabelKey(field, value, entityType);
    return labelKey ? t(labelKey) : value;
  };
  const from = renderValue(oldValue);
  const to = renderValue(newValue);

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-11">
      <span className="text-muted-foreground">{label}</span>
      {from !== null && (
        <>
          <span className="text-muted-foreground/70 line-through">{from}</span>
          <span className="text-muted-foreground/60">→</span>
        </>
      )}
      {to !== null && <span className="font-medium">{to}</span>}
      {from === null && to === null && <span className="text-muted-foreground/60">·</span>}
    </span>
  );
}
