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

export interface AssistantConversationSummary {
  id: string;
  title?: string | null;
  projectId?: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantDispatchResult {
  executionRunId: string;
  runtimeId: string;
  status: string;
}

export const assistantApi = {
  /** 当前会话（conversationId 缺省跟随 updatedAt 最新；传入即切换历史会话） */
  current: (projectId?: string, conversationId?: string) =>
    api.get<AssistantSession>('/ai/assistant/conversations/current', {
      ...(projectId ? { projectId } : {}),
      ...(conversationId ? { conversationId } : {}),
    }),
  listConversations: (projectId?: string) =>
    api.get<AssistantConversationSummary[]>(
      '/ai/assistant/conversations',
      projectId ? { projectId } : undefined,
    ),
  createConversation: (projectId?: string) =>
    api.post<AssistantSession>('/ai/assistant/conversations', {
      ...(projectId ? { projectId } : {}),
    }),
  send: (content: string, projectId?: string, conversationId?: string) =>
    api.post<AssistantSendResult>('/ai/assistant/messages', {
      content,
      ...(projectId ? { projectId } : {}),
      ...(conversationId ? { conversationId } : {}),
    }),
  /** 消息转执行：派发在线 CLI 守护进程（异步跑，结果经建议卡回流） */
  dispatch: (content: string, projectId: string) =>
    api.post<AssistantDispatchResult>('/ai/assistant/dispatches', {
      content,
      projectId,
    }),
};
