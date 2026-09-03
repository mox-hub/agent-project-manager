/**
 * ReactionBar - 评论/活动表情回应条（图1 Linear 风格 chips + 添加表情按钮）
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { EmojiPicker } from '@/shared/components/emoji-picker/emoji-picker';
import type { ActivityItem, ActivityReactionGroup } from '../api/activity-api';
import { useToggleReaction } from '../hooks/use-activity';

export function ReactionBar({
  activity,
  entityId,
}: {
  activity: ActivityItem;
  entityId: string;
}) {
  const { t } = useTranslation();
  const toggleReaction = useToggleReaction(entityId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = (emoji: string) => {
    toggleReaction.mutate(
      { activityId: activity.id, emoji },
      {
        onSuccess: () => setPickerOpen(false),
      },
    );
  };

  const hasReactions = activity.reactions.length > 0;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {activity.reactions.map((group) => (
        <ReactionChip
          key={group.emoji}
          group={group}
          onToggle={() => toggle(group.emoji)}
        />
      ))}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('activity.reaction.add')}
              title={t('activity.reaction.add')}
              className={cn(!hasReactions && 'opacity-0 transition-opacity group-hover/comment:opacity-100', hasReactions && 'opacity-100')}
            >
              <SmilePlus className="text-muted-foreground" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-75 p-0">
          <EmojiPicker onSelect={toggle} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ReactionChip({
  group,
  onToggle,
}: {
  group: ActivityReactionGroup;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const names = group.users.map((u) => u.displayName).join(', ');
  return (
    <button
      type="button"
      onClick={onToggle}
      title={names || undefined}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors',
        group.reactedByMe
          ? 'border-accent-blue/40 bg-accent-blue-light text-accent-blue'
          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
      )}
    >
      <span className="text-sm leading-none">{group.emoji}</span>
      {group.count > 1 && <span className="text-11 font-medium">{group.count}</span>}
      <span className="sr-only">{t('activity.reaction.reacted', { count: group.count })}</span>
    </button>
  );
}
