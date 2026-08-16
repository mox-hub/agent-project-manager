import { api } from '@/infrastructure/api-client';

// ============================================
// Chat Types
// ============================================

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

// ============================================
// AI Agent Types (CLI Dispatch)
// ============================================

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
  success: boolean;
  executionRunId?: string;
  error?: string;
}

// ============================================
// AI Identity Types (Agent Management)
// ============================================

export interface AgentIdentity {
  id: string;
  projectId?: string | null;
  name: string;
  type: 'ai_employee' | 'temp_agent';
  status: 'active' | 'paused' | 'archived';
  description?: string | null;
  systemPrompt?: string | null;
  toolPolicy?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentIdentityRequest {
  projectId?: string;
  name: string;
  type?: 'ai_employee' | 'temp_agent';
  description?: string;
  systemPrompt?: string;
  toolPolicy?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================
// CLI Dispatch Types
// ============================================
// ============================================
// AI Provider Types
// ============================================

export interface AIProviderConfig {
  id: string;
  provider: string;
  providerId?: string;
  displayName: string;
  status?: 'active' | 'inactive' | 'error' | 'connected' | 'disconnected';
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked?: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  availableModels?: string[] | null;
  capabilities?: Record<string, unknown> | null;
  error?: string | null;
  errorMessage?: string | null;
  lastValidatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProviderRequest {
  providerId: string;
  displayName: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled?: boolean;
}

export interface UpdateProviderRequest {
  displayName?: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled?: boolean;
}

export interface ValidateProviderRequest {
  provider: string;
  providerId?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ValidateProviderResponse {
  valid: boolean;
  models?: string[];
  error?: string;
}

// ============================================
// CLI Dispatch Types
// ============================================

export type CliProviderId =
  | 'claude-code'
  | 'codex'
  | 'gemini'
  | 'cursor-agent'
  | 'amp'
  | 'opencode';

export interface CliProvider {
  id: string;
  providerId?: string;
  label: string;
  command: string;
  available: boolean;
  version?: string | null;
  error?: string | null;
}

export interface CliProvidersResponse {
  providers: CliProvider[];
}

export interface DispatchToCliRequest {
  cliProviderId: CliProviderId;
  goal: string;
  input?: Record<string, unknown>;
  projectId?: string;
}

export interface DispatchToCliResponse {
  success: boolean;
  executionRunId?: string;
  error?: string;
}

export type ExecutionRunStatusValue =
  | 'draft'
  | 'planned'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'superseded'
  | 'cancelled';

export interface ExecutionRunStatus {
  id: string;
  status: ExecutionRunStatusValue;
  progress?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
}

export interface ExecutionRunsResponse {
  data: Array<{
    id: string;
    taskId?: string;
    projectId?: string;
    status: ExecutionRunStatusValue;
    startedAt?: string;
    completedAt?: string | null;
    error?: string | null;
  }>;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface McpStatus {
  status: 'online' | 'offline' | 'degraded';
  activeConnections: number;
  availableTools: string[];
  lastCheckedAt: string;
  errors?: Array<{ code: string; message: string }>;
}

export const aiHubApi = {
  // ─── Chat APIs ────────────────────────────────────────────────

  chat: (data: ChatRequest) => api.post<ChatResponse>('/ai/chat', data),

  getConversations: (params?: ConversationListParams) =>
    api
      .get<ConversationListResponse>('/ai/conversations', params)
      .then((res) => res.data),

  getConversation: (id: string) =>
    api.get<AIConversation>(`/ai/conversations/${id}`),

  // ─── Workflow APIs ────────────────────────────────────────────

  getWorkflows: () => api.get<AIWorkflow[]>('/ai/workflows'),

  getWorkflow: (id: string) => api.get<AIWorkflow>(`/ai/workflows/${id}`),

  runWorkflow: (id: string, data: RunWorkflowRequest) =>
    api.post<RunWorkflowResponse>(`/ai/workflows/${id}/run`, data),

  getWorkflowRuns: (params?: any) =>
    api.get('/ai/workflow-runs', params),

  // ─── Model & Usage APIs ───────────────────────────────────────

  getModels: (provider?: string) =>
    api.get<AIModel[]>('/ai/models', provider ? { provider } : undefined),

  getUsage: (params?: any) => api.get<UsageStats>('/ai/usage', params),

  // ─── Provider APIs ────────────────────────────────────────────

  getProviders: () => api.get<AIProviderConfig[]>('/ai/providers'),

  getProvider: (id: string) =>
    api.get<AIProviderConfig>(`/ai/providers/${id}`),

  createProvider: (data: CreateProviderRequest) =>
    api.post<AIProviderConfig>('/ai/providers', data),

  updateProvider: (id: string, data: UpdateProviderRequest) =>
    api.patch<AIProviderConfig>(`/ai/providers/${id}`, data),

  deleteProvider: (id: string) =>
    api.delete(`/ai/providers/${id}`),

  validateProvider: (data: ValidateProviderRequest) =>
    api.post<ValidateProviderResponse>('/ai/providers/validate', data),

  testProvider: (id: string) =>
    api.post<ValidateProviderResponse>(`/ai/providers/${id}/test`),

  detectModels: (id: string) =>
    api.post<{ models: string[] }>(`/ai/providers/${id}/detect-models`),

  // ─── Agent Identity APIs ─────────────────────────────────────

  getAgents: (projectId?: string) =>
    api.get<AgentIdentity[]>('/ai/agents', projectId ? { projectId } : undefined),

  createAgent: (data: CreateAgentIdentityRequest) =>
    api.post<AgentIdentity>('/ai/agents', data),

  // ─── AI Worker APIs ───────────────────────────────────────────

  getAvailableAgents: (projectId: string) =>
    api.get<AIAgent[]>('/ai/agents', { projectId }),

  assignTaskToAI: (data: AssignTaskToAIRequest) =>
    api.post<AssignTaskToAIResponse>('/ai/assign-task', data),

  // ─── CLI Dispatch APIs ────────────────────────────────────────

  getCliProviders: () =>
    api.get<CliProvidersResponse>('/ai/cli-providers'),

  detectCliProviders: () =>
    api.get<{ providers: CliProvider[] }>('/ai/cli-providers/detect'),

  dispatchTaskToCli: (taskId: string, data: DispatchToCliRequest) =>
    api.post<DispatchToCliResponse>(`/ai/tasks/${taskId}/dispatch-cli`, data),

  cancelExecution: (executionRunId: string) =>
    api.post<{ success: boolean }>(`/ai/execution-runs/${executionRunId}/cancel`),

  getExecutionStatus: (executionRunId: string) =>
    api.get<ExecutionRunStatus>(`/ai/execution-runs/${executionRunId}/status`),

  getExecutionRuns: (params?: { projectId?: string; status?: string }) =>
    api.get<ExecutionRunsResponse>('/execution/runs', params),

  getPendingApprovals: (projectId?: string) =>
    api.get<any>('/execution/approvals/pending', projectId ? { projectId } : undefined),

  // ─── MCP APIs ────────────────────────────────────────────────

  getMcpStatus: () =>
    api.get<McpStatus>('/mcp/status'),
};
