/**
 * CommentInput - 评论输入（头像 + @提及 + Markdown 编辑/预览切换 + 表情菜单）
 * 输入区复用标准件 MarkdownEditor（preview="toggle"，窄容器场景）。
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Loader2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MemberAvatar } from '@/components/ui/property-panel';
import { MarkdownEditor } from '@/shared/components/markdown-editor';
import { EmojiPicker } from '@/shared/components/emoji-picker/emoji-picker';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useAddComment } from '../hooks/use-activity';
import type { ActivityEntityType } from '../api/activity-api';

export function CommentInput({
  entityType,
  entityId,
  placeholder,
  autoFocus,
  replyTo,
  onReplyConsumed,
}: {
  entityType: ActivityEntityType;
  entityId: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** 回复目标作者名：变化时自动插入 @提及 */
  replyTo?: string | null;
  onReplyConsumed?: () => void;
}) {
  const { t } = useTranslation();
  const currentUser = useAppStore((s) => s.currentUser);
  const addComment = useAddComment();
  const [content, setContent] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 点「回复」→ 插入 @提及 并聚焦（避免渲染期写入 state，走 effect）
  useEffect(() => {
    if (!replyTo) return;
    setContent((prev) => (prev.includes(`@${replyTo}`) ? prev : `${prev}@${replyTo} `));
    textareaRef.current?.focus();
    onReplyConsumed?.();
    // onReplyConsumed 由父组件用 useCallback 稳定提供或直接内联，这里只在 replyTo 变化时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTo]);

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed || addComment.isPending) return;
    setError(null);
    try {
      await addComment.mutateAsync({ entityType, entityId, content: trimmed });
      setContent('');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('activity.comment.sendFailed'));
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
    // 选完表情把焦点还给输入框
    window.setTimeout(() => textareaRef.current?.focus(), 30);
  };

  return (
    <div className="flex gap-2.5 pt-2">
      <MemberAvatar
        name={currentUser?.displayName || currentUser?.username || '?'}
        avatarUrl={currentUser?.avatarUrl}
      />
      <div className="min-w-0 flex-1">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          rows={2}
          preview="toggle"
          autoFocus={autoFocus}
          inputRef={textareaRef}
          placeholder={placeholder ?? t('activity.comment.placeholder')}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          actions={
            <>
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('activity.comment.emoji')}
                      title={t('activity.comment.emoji')}
                    >
                      <Smile className="text-muted-foreground" />
                    </Button>
                  }
                />
                <PopoverContent align="end" side="top" className="w-75 p-0">
                  <EmojiPicker onSelect={insertEmoji} />
                </PopoverContent>
              </Popover>
              <Button
                size="icon-xs"
                disabled={!content.trim() || addComment.isPending}
                onClick={() => void submit()}
                aria-label={t('activity.comment.send')}
                title={`${t('activity.comment.send')} (⌘⏎)`}
              >
                {addComment.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <ArrowUp className="size-3.5" />
                )}
              </Button>
            </>
          }
        />
        {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
      </div>
    </div>
  );
}
