/**
 * Shared API types aligned with backend standardized response body.
 *
 * Backend envelope (set by TransformInterceptor / GlobalExceptionFilter):
 *   成功: { status, success: true, description, data, timestamp, requestId }
 *   失败: { status, success: false, description, data: null,
 *           error: { code, message, details? }, timestamp, requestId }
 *
 * The frontend `api` client unwraps this envelope automatically and:
 *   - resolves with the business `data` on success
 *   - throws `ApiClientError` on failure
 */

export interface BackendSuccessEnvelope<T> {
  status: number;
  success: true;
  description: string;
  data: T;
  timestamp: string;
  requestId?: string;
}

export interface BackendErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface BackendErrorEnvelope {
  status: number;
  success: false;
  description: string;
  data: null;
  error: BackendErrorPayload;
  timestamp: string;
  requestId?: string;
}

export type BackendEnvelope<T> = BackendSuccessEnvelope<T> | BackendErrorEnvelope;

/**
 * Paginated payload returned from list endpoints.
 * Backend produces this shape via `PaginatedDataDto<T>`.
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Standardized client-side error thrown by the `api` client.
 * Surface details from the backend `error` payload.
 */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly endpoint?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
    requestId?: string;
    endpoint?: string;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.requestId = params.requestId;
    this.endpoint = params.endpoint;
  }
}

// ============================================
// Business DTO aliases (kept for IDE hints)
// ============================================

export interface ConversationListResponse {
  data: PaginatedData<unknown>;
}

export interface ProjectListResponse {
  data: PaginatedData<unknown>;
}

export interface IntegrationListResponse {
  data: PaginatedData<unknown>;
}

export interface NotificationListResponse {
  data: PaginatedData<unknown>;
}

export interface TaskListResponse {
  data: PaginatedData<unknown>;
}

export interface TerminalSessionListResponse {
  data: PaginatedData<unknown>;
}

export interface UserResponse {
  data: unknown;
}

export interface SuccessResponse {
  data: void;
}

export interface ErrorResponse {
  data: { message: string; code: number };
}

export interface PaginatedQueryParams {
  page?: number;
  pageSize?: number;
}

// ============================================
// Execution Module Types
// ============================================

export interface ExecutionRun {
  id: string;
  taskId: string;
  taskTitle?: string;
  projectId: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  traceId?: string;
  steps?: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  executionRunId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export interface ExecutionArtifact {
  id: string;
  executionRunId: string;
  artifactType: 'file' | 'code' | 'image' | 'document' | 'other';
  name: string;
  path?: string;
  content?: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  executionRunId: string;
  taskId: string;
  taskTitle?: string;
  projectId: string;
  agentId: string;
  agentName: string;
  action: string;
  actionType: 'tool_call' | 'git_write' | 'terminal_exec' | 'external_sync' | 'status_change';
  riskLevel: 'read' | 'write' | 'high_risk';
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'auto_approved';
  reason?: string;
  createdAt: string;
  evaluatedAt?: string;
  evaluatorId?: string;
  evaluation?: string;
  traceId?: string;
}

export interface ApprovalAction {
  action: 'approve' | 'reject';
  reason?: string;
}

// ============================================
// Runtime Module Types
// ============================================

export interface RuntimeCapability {
  type: 'file' | 'git' | 'terminal' | 'process' | 'credentials' | 'cli';
  enabled: boolean;
  version?: string;
  config?: Record<string, unknown>;
}

export interface Runtime {
  id: string;
  projectId?: string;
  agentId: string;
  agentName: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: RuntimeCapability[];
  lastHeartbeat?: string;
  connectedAt: string;
  disconnectedAt?: string;
}

export interface RuntimeSession {
  id: string;
  runtimeId: string;
  userId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastActivity?: string;
}

// ============================================
// Document Module Types
// ============================================

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: 'markdown' | 'spec' | 'readme' | 'guide' | 'other';
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  tags?: string[];
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  createdBy: string;
  createdAt: string;
  changeNote?: string;
}
