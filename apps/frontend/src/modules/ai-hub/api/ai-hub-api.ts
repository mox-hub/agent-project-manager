import { api } from '@/infrastructure/api-client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ContextHints {
  includeGitDiff?: boolean;
  includeRecentActivities?: boolean;
  includeProjectSummary?: boolean;
  includeTaskDetails?: boolean;
}

export interface ChatRequest {
  projectId?: string;
  taskId?: string;
  conversationId?: string;
  message: ChatMessage;
  contextHints?: ContextHints;
  modelPreference?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    modelName?: string;
  };
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelName?: string | null;
  tokens?: number | null;
  metadata?: any;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  projectId?: string | null;
  taskId?: string | null;
  title?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
  messages?: AIMessage[];
  project?: {
    id: string;
    name: string;
  } | null;
  task?: {
    id: string;
    title: string;
  } | null;
  _count?: {
    messages: number;
  };
}

export interface ConversationListParams {
  projectId?: string;
  taskId?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ConversationListResponse {
  data: AIConversation[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface AIWorkflow {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  version: number;
}

export interface RunWorkflowRequest {
  projectId?: string;
  taskId?: string;
  parameters?: Record<string, any>;
  triggerType?: string;
}

export interface RunWorkflowResponse {
  workflowRunId: string;
  status: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  taskTypes?: string[] | null;
  maxTokens?: number | null;
  enabled: boolean;
}

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  byModel: Array<{
    modelName: string;
    totalTokens: number;
    totalCost: number;
  }>;
}

export const aiHubApi = {
  chat: (data: ChatRequest) => api.post<ChatResponse>('/ai/chat', data),

  getConversations: (params?: ConversationListParams) =>
    api
      .get<ConversationListResponse>('/ai/conversations', params)
      .then((res) => res.data),

  getConversation: (id: string) =>
    api.get<AIConversation>(`/ai/conversations/${id}`),

  getWorkflows: () => api.get<AIWorkflow[]>('/ai/workflows'),

  getWorkflow: (id: string) => api.get<AIWorkflow>(`/ai/workflows/${id}`),

  runWorkflow: (id: string, data: RunWorkflowRequest) =>
    api.post<RunWorkflowResponse>(`/ai/workflows/${id}/run`, data),

  getWorkflowRuns: (params?: any) =>
    api.get('/ai/workflow-runs', params),

  getModels: () => api.get<AIModel[]>('/ai/models'),

  getUsage: (params?: any) => api.get<UsageStats>('/ai/usage', params),
};
