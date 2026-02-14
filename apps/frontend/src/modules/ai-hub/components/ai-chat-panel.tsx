import { useState, useEffect, useRef } from 'react';
import { useAIChat, useAIStream } from '../hooks/use-ai-chat';
import { useAIConversation } from '../hooks/use-ai-conversations';
import { useAppStore } from '@/infrastructure/store/app-store';

interface AIChatPanelProps {
  conversationId?: string;
  projectId?: string;
  taskId?: string;
}

export function AIChatPanel({
  conversationId,
  projectId,
  taskId,
}: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentProjectId } = useAppStore();

  const chatMutation = useAIChat();
  const { data: conversation, refetch } = useAIConversation(conversationId);

  const activeProjectId = projectId || currentProjectId;

  // Stream handling
  const stream = useAIStream(
    conversationId,
    (chunk) => {
      setStreamingContent((prev) => prev + chunk);
    },
    () => {
      setIsStreaming(false);
      setStreamingContent('');
      refetch();
    },
  );

  useEffect(() => {
    stream.subscribe();
    return () => {
      stream.unsubscribe();
    };
  }, [conversationId]);

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
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0f172a',
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {displayMessages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280',
              fontSize: '14px',
            }}
          >
            开始对话...
          </div>
        ) : (
          displayMessages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent:
                  message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor:
                    message.role === 'user' ? '#3b82f6' : '#1e293b',
                  color: '#e5e7eb',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: '1px solid #1e293b',
          padding: '16px',
          backgroundColor: '#0f172a',
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息..."
              disabled={chatMutation.isPending || isStreaming}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                backgroundColor: '#1e293b',
                color: '#e5e7eb',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending || isStreaming}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor:
                  !input.trim() || chatMutation.isPending || isStreaming
                    ? '#374151'
                    : '#3b82f6',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor:
                  !input.trim() || chatMutation.isPending || isStreaming
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {chatMutation.isPending || isStreaming ? '发送中...' : '发送'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
