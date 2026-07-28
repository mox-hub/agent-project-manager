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

export interface AIAgent {
  id: string;
  subjectType: string;
  subjectId: string;
  providerId: string;
  identitySource: string;
  mappedRole: string | null;
  runtimeOnline: boolean;
}

export interface AssignTaskToAIRequest {
  taskId: string;
  agentSubjectId: string;
  projectId: string;
}

export interface AssignTaskToAIResponse {
  taskId: string;
  executionRunId: string;
  runtimeId: string;
  status: string;
}

// ============================================
// AI Provider Types
// ============================================

export type AIProviderType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'glm';
export type AIProviderStatus = 'connected' | 'disconnected' | 'error';
export type AISdkType = 'openai' | 'anthropic' | 'google';

export interface AIProviderConfig {
  id: string;
  provider: AIProviderType;
  displayName?: string;
  sdkType?: AISdkType;
  baseUrl?: string;
  organizationId?: string;
  hasApiKey: boolean;
  enabled: boolean;
  status: AIProviderStatus;
  lastValidatedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface CreateProviderRequest {
  provider: AIProviderType;
  displayName: string;
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateProviderRequest {
  displayName?: string;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  enabled?: boolean;
  metadata?: Record<string, any>;
}

export interface ValidateProviderRequest {
  provider: AIProviderType;
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
}

export interface ValidateProviderResponse {
  valid: boolean;
  models?: string[];
  error?: string;
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

  getModels: (provider?: string) =>
    api.get<AIModel[]>('/ai/models', provider ? { provider } : undefined),

  getUsage: (params?: any) => api.get<UsageStats>('/ai/usage', params),

  // ─── Provider APIs ────────────────────────────────────────

  /** 获取所有 Provider 配置 */
  getProviders: () => api.get<AIProviderConfig[]>('/ai/providers'),

  /** 获取单个 Provider */
  getProvider: (id: string) =>
    api.get<AIProviderConfig>(`/ai/providers/${id}`),

  /** 创建 Provider */
  createProvider: (data: CreateProviderRequest) =>
    api.post<AIProviderConfig>('/ai/providers', data),

  /** 更新 Provider */
  updateProvider: (id: string, data: UpdateProviderRequest) =>
    api.patch<AIProviderConfig>(`/ai/providers/${id}`, data),

  /** 删除 Provider */
  deleteProvider: (id: string) =>
    api.delete(`/ai/providers/${id}`),

  /** 校验 Provider 凭证（不落库） */
  validateProvider: (data: ValidateProviderRequest) =>
    api.post<ValidateProviderResponse>('/ai/providers/validate', data),

  /** 测试已保存的 Provider（解密 apiKey 进行测试，更新 status） */
  testProvider: (id: string) =>
    api.post<ValidateProviderResponse>(`/ai/providers/${id}/test`),

  /** 自动检测可用模型 */
  detectModels: (id: string) =>
    api.post<{ models: string[] }>(`/ai/providers/${id}/detect-models`),

  // ─── AI Worker APIs ──────────────────────────────────────────

  /** List available AI agents for a project */
  getAvailableAgents: (projectId: string) =>
    api.get<AIAgent[]>('/ai/agents', { projectId }),

  /** Assign a task to an AI agent */
  assignTaskToAI: (data: AssignTaskToAIRequest) =>
    api.post<AssignTaskToAIResponse>('/ai/assign-task', data),
};
