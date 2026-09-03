/**
 * ActivityComment - 评论卡（头像 + 作者 + 相对时间 + Markdown 正文 + 表情回应 + 行内编辑）
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Pencil, Reply, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/ui/property-panel';
import { MarkdownView } from '@/shared/components/markdown-view';
import { MarkdownEditor } from '@/shared/components/markdown-editor';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { ActivityItem } from '../api/activity-api';
import { useDeleteComment, useUpdateComment } from '../hooks/use-activity';
import { ReactionBar } from './reaction-bar';

export function ActivityComment({
  activity,
  entityId,
  onReply,
}: {
  activity: ActivityItem;
  entityId: string;
  onReply: (authorName: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const currentUser = useAppStore((s) => s.currentUser);
  const updateComment = useUpdateComment(entityId);
  const deleteComment = useDeleteComment(entityId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const isMine = !!currentUser && activity.actor?.id === currentUser.id;
  const edited = !!(activity.metadata as { edited?: boolean } | null)?.edited;
  const authorName = activity.actor?.displayName || activity.actor?.username || t('activity.anonymous');

  const relativeTime = formatDistanceToNow(new Date(activity.createdAt), {
    addSuffix: true,
    locale: i18n.language === 'zh-CN' ? zhCN : undefined,
  });

  const startEdit = () => {
    setDraft(activity.content ?? '');
    setEditing(true);
  };

  const saveEdit = () => {
    const content = draft.trim();
    if (!content) return;
    updateComment.mutate(
      { id: activity.id, content },
      {
        onSuccess: () => {
          setEditing(false);
        },
      },
    );
  };

  return (
    <div className="group/comment flex gap-2.5 py-2">
      <MemberAvatar name={authorName} avatarUrl={activity.actor?.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-11 text-muted-foreground">{relativeTime}</span>
          {edited && (
            <span className="text-10 text-muted-foreground/70">
              ({t('activity.comment.edited')})
            </span>
          )}
          <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover/comment:opacity-100">
            <Button
              variant="ghost"
              size="icon-xs"
              title={t('activity.comment.reply')}
              onClick={() => onReply(authorName)}
            >
              <Reply className="size-3" />
            </Button>
            {isMine && (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title={t('common.edit')}
                  onClick={startEdit}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title={t('common.delete')}
                  className="hover:text-destructive"
                  disabled={deleteComment.isPending}
                  onClick={() => deleteComment.mutate(activity.id)}
                >
                  {deleteComment.isPending ? (
                    <Spinner className="size-3 text-inherit" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </Button>
              </>
            )}
          </span>
        </div>

        {editing ? (
          <MarkdownEditor
            autoFocus
            value={draft}
            onChange={setDraft}
            rows={3}
            preview="toggle"
            className="mt-1"
            actions={
              <>
                <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
                  {t('common.cancel')}
                </Button>
                <Button size="xs" disabled={!draft.trim() || updateComment.isPending} onClick={saveEdit}>
                  {updateComment.isPending ? <Spinner className="size-3 text-inherit" /> : t('common.save')}
                </Button>
              </>
            }
          />
        ) : (
          <>
            <MarkdownView
              content={activity.content ?? activity.summary ?? ''}
              className="mt-0.5"
            />
            <ReactionBar activity={activity} entityId={entityId} />
          </>
        )}
      </div>
    </div>
  );
}
