import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAIChat, useAIStream } from '../hooks/use-ai-chat';
import { useAIConversation } from '../hooks/use-ai-conversations';
import { useAppStore } from '@/infrastructure/store/app-store';

interface AIChatPanelProps {
  conversationId?: string;
  projectId?: string;
  taskId?: string;
}

export function AIChatPanel({ conversationId, projectId, taskId }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentProjectId } = useAppStore();

  const chatMutation = useAIChat();
  const { data: conversation, refetch } = useAIConversation(conversationId);

  const activeProjectId: string | undefined = projectId || currentProjectId || undefined;

  const handleChunk = useCallback((chunk: string) => {
    setStreamingContent((prev) => prev + chunk);
  }, []);

  const handleComplete = useCallback(() => {
    setIsStreaming(false);
    setStreamingContent('');
    refetch();
  }, [refetch]);

  const stream = useAIStream(conversationId, handleChunk, handleComplete);

  useEffect(() => {
    stream.subscribe();
    return () => {
      stream.unsubscribe();
    };
  }, [stream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    setIsStreaming(true);
    setStreamingContent('');

    try {
      await chatMutation.mutateAsync({
        projectId: activeProjectId,
        taskId,
        conversationId,
        message: {
          role: 'user',
          content: input,
        },
        contextHints: {
          includeProjectSummary: !!activeProjectId,
          includeTaskDetails: !!taskId,
          includeRecentActivities: true,
        },
      });
      setInput('');
    } catch (error) {
      console.error('Chat error:', error);
      setIsStreaming(false);
    }
  };

  const messages = conversation?.messages || [];
  const displayMessages = [
    ...messages,
    ...(isStreaming && streamingContent
      ? [
          {
            id: 'streaming',
            role: 'assistant' as const,
            content: streamingContent,
            createdAt: new Date().toISOString(),
          },
        ]
      : []),
  ];

  return (
    <div
      className="flex h-full flex-col bg-background"
      data-ai-component="ai-hub.ai-space.chat-panel.container"
      data-ai-role="content"
    >
      <div className="flex-1 overflow-y-auto p-4">
        {displayMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            开始对话...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayMessages.map((message) => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                data-ai-component={`ai-hub.ai-space.chat-panel.message.${message.id}`}
                data-ai-role="content"
              >
                <div
                  className={
                    message.role === 'user'
                      ? 'max-w-[72%] rounded-xl bg-accent-blue px-4 py-3 text-sm text-white'
                      : 'max-w-[72%] rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground'
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-background p-4">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2"
          data-ai-component="ai-hub.ai-space.chat-panel.input-form"
          data-ai-role="input"
        >
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={chatMutation.isPending || isStreaming}
            className="flex-1"
            data-ai-component="ai-hub.ai-space.chat-panel.input"
            data-ai-action="ai-hub.ai-space.chat-panel.input.change"
          />
          <Button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending || isStreaming}
            data-ai-component="ai-hub.ai-space.chat-panel.send"
            data-ai-action="ai-hub.ai-space.chat-panel.send.click"
            data-ai-role="submit"
          >
            {chatMutation.isPending || isStreaming ? '发送中...' : '发送'}
          </Button>
        </form>
      </div>
    </div>
  );
}

