/**
 * 主 AI 助手 API —— 长驻会话（按作用域）与消息发送。
 * 流式增量不经 REST：走 /events 命名空间的 ai.stream 事件
 * （载荷 {conversationId, messageId, chunk: UIMessageChunk, userId}，见 use-assistant-chat）。
 * assistant 消息 content 为 UIMessage JSON（metadata.format='ui-message'），
 * 旧数据为纯文本，渲染时回退。
 */
import { api } from '@/infrastructure/api-client';
import type {
  ApiSchemas,
  RequestBodyOf,
} from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO），响应体
 * 在服务端补 @ApiOkResponse 之前仍维持手写 interface。
 */
export interface AssistantMessageMetadata {
  format?: string;
  status?: 'running' | 'done' | 'failed';
  source?: string;
  executionRunId?: string;
  model?: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelName?: string | null;
  metadata?: AssistantMessageMetadata | null;
  createdAt: string;
}

export interface AssistantSession {
  conversationId: string;
  projectId?: string | null;
  /** 会话记忆的模型选择（send model 参数回写） */
  model?: string | null;
  messages: AssistantMessage[];
}

export interface AssistantSendResult {
  conversationId: string;
  /** sync=LLM 通道同步终文；runtime=CLI 对话桥异步回流 */
  mode: 'sync' | 'runtime';
  message: {
    id: string;
    role: string;
    content: string;
    modelName?: string | null;
  };
  executionRunId?: string;
  runtimeId?: string;
  status?: string;
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

export type AssistantModelType = 'runtime' | 'runtime-provider' | 'llm';

export interface AssistantModelOption {
  id: string;
  type: AssistantModelType;
  runtimeId?: string;
  provider?: string;
  label: string;
  model?: string | null;
  providers?: string[];
  online: boolean;
}

/** 请求侧实体上下文，单源于契约 AssistantViewingDto（形状一致） */
export type AssistantViewing = ApiSchemas['AssistantViewingDto'];

export type AssistantSendPayload = RequestBodyOf<'AssistantController_sendMessage'>;

/** silent 选项单源于契约 AssistantSilentDto（context 现为开放键值对象） */
export type AssistantSilentOptions = Omit<
  RequestBodyOf<'AssistantController_silent'>,
  'scenario'
>;

export interface AssistantSilentResult {
  scenario: string;
  data: Record<string, unknown>;
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
  send: (payload: AssistantSendPayload) =>
    api.post<AssistantSendResult>('/ai/assistant/messages', {
      content: payload.content,
      ...(payload.projectId ? { projectId: payload.projectId } : {}),
      ...(payload.conversationId ? { conversationId: payload.conversationId } : {}),
      ...(payload.model ? { model: payload.model } : {}),
      ...(payload.viewing ? { viewing: payload.viewing } : {}),
    }),
  /** 可选模型：在线 CLI 守护进程通道 + 已启用 LLM provider */
  listModels: () => api.get<{ models: AssistantModelOption[] }>('/ai/assistant/models'),
  /** 消息转执行：派发在线 CLI 守护进程（异步跑，结果经建议卡回流） */
  dispatch: (content: string, projectId: string) =>
    api.post<AssistantDispatchResult>('/ai/assistant/dispatches', {
      content,
      projectId,
    }),
  /** 统一后台静默 AI：按场景（quick-prompts/create-suggestions/project-score…）拿结构化建议 */
  silent: (scenario: string, options?: AssistantSilentOptions) =>
    api.post<AssistantSilentResult>('/ai/assistant/silent', {
      scenario,
      ...(options?.projectId ? { projectId: options.projectId } : {}),
      ...(options?.context ? { context: options.context } : {}),
    }),
};
