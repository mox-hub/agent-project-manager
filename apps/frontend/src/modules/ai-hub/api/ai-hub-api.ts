import { api } from '@/infrastructure/api-client';
import type { QueryOf, ResponseOf } from '@/infrastructure/api-client/contract';

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
  issueId?: string;
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
  /** 后端 Json 自由字段，前端无结构化消费，收窄为 unknown */
  metadata?: unknown;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  projectId?: string | null;
  issueId?: string | null;
  title?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** 后端 Json 自由字段，前端无结构化消费，收窄为 unknown */
  metadata?: unknown;
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
  issueId?: string;
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
  /** 调用总次数与来源分类计数（conversation=对话 / execution·workflow=执行链 / silent=系统自动静默） */
  totalCalls?: number;
  conversationCalls?: number;
  executionCalls?: number;
  silentCalls?: number;
  byModel: Array<{
    modelName: string;
    totalTokens: number;
    totalCost: number;
  }>;
  byDay?: Array<{
    day: string;
    totalTokens: number;
    totalCost: number;
  }>;
}

// ============================================
// AI Worker Types (V3: Member 身份)
// ============================================

export interface AssignTaskToAIRequest {
  issueId: string;
  /** AI 成员 Member.id（type=ai_agent） */
  memberId: string;
  /** 4d-3：绑定既有执行项派发（可选） */
  executionId?: string;
  /** 仅供前端缓存失效用，不发送；收件箱任务为 null */
  projectId?: string | null;
}

export interface AssignTaskToAIResponse {
  success: boolean;
  /** 仅 AI 成员自动派发失败时返回（不阻塞指派），见 openapi IssueAssigneeWithMemberDto */
  dispatchError?: string;
  /** 两级审计 gate：派发黄牌警告文案（审计 red，不阻断执行） */
  auditWarning?: string;
  executionRunId?: string;
  error?: string;
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
  /** 该厂家已启用模型清单（AIModelConfig：模型查询结果落库） */
  availableModels?: string[] | null;
  /** 非敏感附加配置（含 modelsEndpoint 模型查询链接覆盖） */
  metadata?: Record<string, unknown> | null;
  capabilities?: Record<string, unknown> | null;
  error?: string | null;
  errorMessage?: string | null;
  lastValidatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** 工作区内置模型（无显式偏好时 AI 调用链的默认 provider+model；未设置两者为 null） */
export interface AiDefaultModel {
  provider?: string | null;
  model?: string | null;
}

/** 套餐型限额窗口（如编程套餐的 5 小时/周/月限额；token 数或金额视厂家而定） */
export interface AiBalanceWindow {
  period: '5h' | 'day' | 'week' | 'month' | (string & {});
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
  resetsAt?: string | null;
}

/**
 * Provider 余额（归一化）：prepaid=充值型（单余额，如 DeepSeek /user/balance）/
 * subscription=套餐型（5h/周/月等限额窗口）/ unknown=无法识别的返回形状
 */
export interface AiProviderBalance {
  type: 'prepaid' | 'subscription' | 'unknown';
  currency?: string | null;
  balance?: number | null;
  /** 充值型可选：赠送/充值累计（可作进度条分母） */
  grantedBalance?: number | null;
  toppedUpBalance?: number | null;
  isAvailable?: boolean | null;
  windows: AiBalanceWindow[];
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
  /** 非敏感附加配置（整体替换，调用方负责与既有 metadata 合并） */
  metadata?: Record<string, unknown>;
}

export interface ValidateProviderRequest {
  provider: string;
  providerId?: string;
  apiKey?: string;
  baseUrl?: string;
  /** 已保存配置记录 ID——校验通过时后端同步该记录在线状态为 connected */
  providerConfigId?: string;
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
  /** AI 成员 Member.id（可选，缺省回落 issue.aiAgentId） */
  memberId?: string;
  providerId?: CliProviderId;
  model?: string;
  allowedTools?: string[];
  timeout?: number;
  /** 4d-3：绑定既有执行项，传入则不新建执行项 */
  executionId?: string;
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
    issueId?: string;
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

  // ─── Model & Usage APIs ───────────────────────────────────────

  getModels: (provider?: string) =>
    api.get<AIModel[]>('/ai/models', provider ? { provider } : undefined),

  getUsage: (params?: QueryOf<'AiHubController_getUsage'>) => api.get<UsageStats>('/ai/usage', params),

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
    api.post<{ models: string[]; synced: boolean }>(
      `/ai/providers/${id}/detect-models`,
    ),

  /** 查询厂家余额（归一化：充值型单余额 / 套餐型限额窗口） */
  getProviderBalance: (id: string) =>
    api.get<AiProviderBalance>(`/ai/providers/${id}/balance`),

  getDefaultModel: () => api.get<AiDefaultModel>('/ai/default-model'),

  setDefaultModel: (data: { provider: string; model: string }) =>
    api.put<AiDefaultModel>('/ai/default-model', data),

  // ─── AI Worker APIs ───────────────────────────────────────────

  assignTaskToAI: ({ projectId: _projectId, ...payload }: AssignTaskToAIRequest) =>
    api.post<AssignTaskToAIResponse>('/ai/assign-issue', payload),

  // ─── CLI Dispatch APIs ────────────────────────────────────────

  getCliProviders: () =>
    api.get<CliProvidersResponse>('/ai/cli-providers'),

  detectCliProviders: () =>
    api.get<{ providers: CliProvider[] }>('/ai/cli-providers/detect'),

  dispatchTaskToCli: (issueId: string, data: DispatchToCliRequest) =>
    api.post<DispatchToCliResponse>(`/ai/issues/${issueId}/dispatch-cli`, data),

  /**
   * 重新执行失败/阻塞执行（兜底批 5）：服务端克隆新建一条执行
   * （retryOfId 血缘指回原执行）并走同一派发链，原执行终态留痕不动。
   * payload.diagnosis（批一 P0 切片 3，裁决 D）：「按诊断重试」时把失败
   * 诊断结论随血缘写入新执行的 retryContext
   */
  retryExecution: (executionRunId: string, payload?: { diagnosis?: string }) =>
    api.post<DispatchToCliResponse>(
      `/ai/execution-runs/${executionRunId}/retry`,
      payload,
    ),

  cancelExecution: (executionRunId: string) =>
    api.post<{ success: boolean }>(`/ai/execution-runs/${executionRunId}/cancel`),

  getExecutionStatus: (executionRunId: string) =>
    api.get<ExecutionRunStatus>(`/ai/execution-runs/${executionRunId}/status`),

  getExecutionRuns: (params?: { projectId?: string; status?: string }) =>
    api.get<ExecutionRunsResponse>('/execution/runs', params),

  getPendingApprovals: (projectId?: string) =>
    api.get<ResponseOf<'ExecutionController_getPendingApprovals'>>(
      '/execution/approvals/pending',
      projectId ? { projectId } : undefined,
    ),

  // ─── MCP APIs ────────────────────────────────────────────────

  getMcpStatus: () =>
    api.get<McpStatus>('/mcp/status'),
};
