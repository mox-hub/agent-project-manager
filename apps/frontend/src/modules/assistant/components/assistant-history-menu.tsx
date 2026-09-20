/**
 * 历史对话菜单 —— 头部时钟按钮弹出：新建对话 + 历史会话列表（相对时间，
 * 当前会话高亮；点选切换、空会话显示「新对话」占位）。
 * AssistantHistoryList 独立导出便于测试。
 */
import { useTranslation } from 'react-i18next';
import { History, SquarePen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import type { AssistantConversationSummary } from '../api/assistant-api';

function formatRelativeParts(iso: string): { key: string; n?: number } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return { key: 'assistant.history.justNow' };
  if (diffMins < 60) return { key: 'assistant.history.minutesAgo', n: diffMins };
  if (diffHours < 24) return { key: 'assistant.history.hoursAgo', n: diffHours };
  if (diffDays < 7) return { key: 'assistant.history.daysAgo', n: diffDays };
  return null; // 更老直接显示日期
}

export function AssistantHistoryList({
  conversations,
  isLoading,
  activeConversationId,
  currentConversationId,
  onSelect,
  onCreate,
}: {
  conversations: AssistantConversationSummary[];
  isLoading?: boolean;
  /** 菜单持有者当前展示的会话（跟随模式为 currentConversationId） */
  activeConversationId: string | null;
  /** 服务端「当前会话」（最新 updatedAt），空会话占位与高亮用它兜底 */
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1" data-ai-component="assistant.history-list">
      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={onCreate}
        className="h-8 justify-start gap-2 text-xs"
        data-ai-action="assistant.history.new.click"
      >
        <SquarePen className="size-3.5" />
        {t('assistant.history.new')}
      </Button>
      {isLoading ? null : conversations.length === 0 ? (
        <p className="px-2 py-3 text-11 text-content-text-muted">
          {t('assistant.history.empty')}
        </p>
      ) : (
        <div className="max-h-100 overflow-y-auto">
          {conversations.map((conversation) => {
            const isActive = conversation.id === (activeConversationId ?? currentConversationId);
            const title =
              conversation.messageCount > 0 && conversation.title
                ? conversation.title
                : t('assistant.history.untitled');
            const rel = formatRelativeParts(conversation.updatedAt);
            return (
              <Button
                key={conversation.id}
                type="button"
                variant="ghost"
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  'h-auto w-full justify-between gap-2 px-2 py-1.5 text-left font-normal',
                  isActive && 'bg-accent',
                )}
              >
                <span className="min-w-0 flex-1 truncate text-xs text-content-text">
                  {title}
                </span>
                <span className="shrink-0 text-11 text-content-text-muted">
                  {rel
                    ? t(rel.key, rel.n !== undefined ? { n: rel.n } : {})
                    : new Date(conversation.updatedAt).toLocaleDateString()}
                </span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AssistantHistoryMenu({
  conversations,
  isLoading,
  activeConversationId,
  currentConversationId,
  onSelect,
  onCreate,
}: {
  conversations: AssistantConversationSummary[];
  isLoading?: boolean;
  activeConversationId: string | null;
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <HeaderActionButton icon={History} label={t('assistant.history.open')} />
        }
      />
      <PopoverContent align="end" className="w-72 p-2">
        <AssistantHistoryList
          conversations={conversations}
          isLoading={isLoading}
          activeConversationId={activeConversationId}
          currentConversationId={currentConversationId}
          onSelect={onSelect}
          onCreate={onCreate}
        />
      </PopoverContent>
    </Popover>
  );
}
