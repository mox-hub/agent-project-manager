/**
 * 消息流 —— UIMessage parts 渲染：assistant 左侧（Bot 头像 + 气泡）、user 右侧气泡。
 * text 段走 MarkdownView（独立气泡）；tool 段走 AssistantToolCard（折叠工具卡，
 * 决策建议内联 DecisionCard）——对齐成熟 agent 工具的工具块形态；
 * CLI 桥 running 占位渲染工作指示；流式增量由 useChat 实时聚合进 parts。
 */
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { MarkdownView } from '@/shared/components/markdown-view';
import { isTextUIPart } from 'ai';
import {
  useAssistantChatHelpers,
  type AssistantChatMessage,
} from '../hooks/use-assistant-chat';
import {
  AssistantToolCard,
  type AssistantToolPart,
} from './assistant-tool-card';

function AssistantBubble({ message }: { message: AssistantChatMessage }) {
  const { t } = useTranslation();
  const runStatus = message.metadata?.runStatus;

  if (message.parts.length === 0) {
    // CLI 对话桥的 running 占位 / 异常空消息
    const working = runStatus === 'running';
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-lg bg-content-bg-secondary px-3 py-2 text-sm',
          working ? 'text-content-text-secondary' : 'text-content-text-muted',
        )}
        data-ai-component="assistant.message-pending"
      >
        {working ? (
          <Spinner size="sm" className="size-3.5 shrink-0 text-accent-purple" />
        ) : null}
        {working
          ? t('assistant.chat.working')
          : t('assistant.chat.thinking')}
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 max-w-4/5 flex-col items-start gap-1.5"
      data-ai-component="assistant.message-assistant"
    >
      {message.parts.map((part, index) => {
        if (isTextUIPart(part)) {
          if (!part.text) return null;
          return (
            <div
              className="w-full break-words rounded-lg bg-content-bg-secondary px-3 py-2 text-sm text-content-text"
              key={index}
            >
              <MarkdownView content={part.text} />
            </div>
          );
        }
        if (part.type.startsWith('tool-')) {
          return (
            <AssistantToolCard
              key={index}
              part={part as unknown as AssistantToolPart}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function MessageRow({ message }: { message: AssistantChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    const text = message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
    return (
      <div className="flex justify-end" data-ai-component="assistant.message-user">
        <div className="max-w-4/5 rounded-lg bg-accent-blue-light px-3 py-2 text-sm whitespace-pre-wrap break-words text-content-text">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
        <Bot className="size-3.5" />
      </span>
      <AssistantBubble message={message} />
    </div>
  );
}

export function AssistantMessageList() {
  const { t } = useTranslation();
  const { messages, status, error, clearError } = useAssistantChatHelpers();

  return (
    <div className="space-y-3" data-ai-component="assistant.message-list">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
      {status === 'submitted' ? (
        <div className="flex items-start gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-purple-light text-accent-purple">
            <Bot className="size-3.5" />
          </span>
          <div className="rounded-lg bg-content-bg-secondary px-3 py-2 text-sm text-content-text-muted">
            {t('assistant.chat.thinking')}
          </div>
        </div>
      ) : null}
      {error ? (
        <div
          className="flex flex-col items-end gap-1"
          data-ai-component="assistant.message-error"
        >
          <div className="max-w-4/5 rounded-lg border border-accent-red/30 bg-accent-red-light/60 px-3 py-2 text-xs text-accent-red">
            <p className="break-words">{error.message}</p>
            <button
              type="button"
              onClick={() => clearError()}
              className="mt-1 text-11 underline-offset-2 hover:underline"
            >
              {t('assistant.chat.dismissError')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
