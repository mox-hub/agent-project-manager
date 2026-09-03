/**
 * 消息流 —— assistant 左侧（Bot 头像 + 气泡）、user 右侧气泡；
 * pending 占位渲染流式文本（无则提示词），错误态展示原因 + 重试。
 */
import { useTranslation } from 'react-i18next';
import { Bot, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AssistantChatMessage } from '../hooks/use-assistant-session';

function MessageRow({
  message,
  streamText,
  onRetry,
}: {
  message: AssistantChatMessage;
  streamText?: string | null;
  onRetry?: (content: string) => void;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  if (message.error) {
    return (
      <div
        className="flex flex-col items-end gap-1"
        data-ai-component="assistant.message-error"
      >
        <div className="max-w-4/5 rounded-lg border border-accent-red/30 bg-accent-red-light/60 px-3 py-2 text-xs text-accent-red">
          <p className="break-words">{message.error}</p>
          {message.retryContent && onRetry ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onRetry(message.retryContent!)}
              className="mt-1 h-5 gap-1 px-1 text-11 text-accent-red underline-offset-2 hover:underline"
            >
              <RotateCw className="size-3" />
              {t('assistant.chat.retry')}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (message.pending) {
    return (
      <div className="flex items-start gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
          <Bot className="size-3.5" />
        </span>
        <div className="rounded-lg bg-content-bg-secondary px-3 py-2 text-sm whitespace-pre-wrap text-content-text-secondary">
          {message.content || streamText || t('assistant.chat.thinking')}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'items-start gap-2')}>
      {!isUser && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
          <Bot className="size-3.5" />
        </span>
      )}
      <div
        className={cn(
          'max-w-4/5 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-accent-blue-light text-content-text'
            : 'bg-content-bg-secondary text-content-text',
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function AssistantMessageList({
  messages,
  streamText,
  onRetry,
}: {
  messages: AssistantChatMessage[];
  /** 当前会话的 ai.stream 聚合文本（渲染进 pending 占位气泡） */
  streamText?: string | null;
  onRetry?: (content: string) => void;
}) {
  if (messages.length === 0 && !streamText) return null;
  return (
    <div className="space-y-3" data-ai-component="assistant.message-list">
      {messages.map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          streamText={streamText}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
