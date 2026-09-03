/**
 * 主 AI 助手 API —— 长驻会话（按作用域）与消息发送。
 * 流式增量不经 REST：走 /events 命名空间的 ai.stream 事件（见 use-assistant-stream）。
 */
import { api } from '@/infrastructure/api-client';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelName?: string | null;
  createdAt: string;
}

export interface AssistantSession {
  conversationId: string;
  projectId?: string | null;
  messages: AssistantMessage[];
}

export interface AssistantSendResult {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    modelName?: string | null;
  };
}

export const assistantApi = {
  current: (projectId?: string) =>
    api.get<AssistantSession>(
      '/ai/assistant/conversations/current',
      projectId ? { projectId } : undefined,
    ),
  send: (content: string, projectId?: string) =>
    api.post<AssistantSendResult>('/ai/assistant/messages', {
      content,
      ...(projectId ? { projectId } : {}),
    }),
};
