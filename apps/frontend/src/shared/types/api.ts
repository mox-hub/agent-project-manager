/**
 * Shared API types for backend communication
 *
 * This file defines standard response wrapper format
 * Used to handle mismatch between backend { data: T, meta: {...} } format and frontend expectations of T
 */

/**
 * Standard API response wrapper
 *
 * Backend returns: { data: T, meta?: {...} }
 * Frontend expects: T
 * This wrapper adapts response format uniformly
 *
 * @template T
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

// Import types from their respective modules
// These will be resolved by TypeScript module resolution

/**
 * Conversation list response
 * Backend returns: { data: AIConversation[], meta: { page, pageSize, total } }
 */
export interface ConversationListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Project list response
 * Backend returns: { data: Project[], meta: { page, pageSize, total } }
 */
export interface ProjectListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Integration list response
 * Backend returns: { data: Integration[], meta: { page, pageSize, total } }
 */
export interface IntegrationListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Notification list response
 * Backend returns: { data: Notification[], meta: { page, pageSize, total } }
 */
export interface NotificationListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Task list response
 * Backend returns: { data: Task[], meta: { page, pageSize, total } }
 */
export interface TaskListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Terminal session list response
 * Backend returns: { data: TerminalSession[], meta: { page, pageSize, total } }
 */
export interface TerminalSessionListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * User profile response
 */
export interface UserResponse {
  data: any;
}

/**
 * Generic success response
 */
export interface SuccessResponse extends ApiResponse<void> {}

/**
 * Generic error response
 */
export interface ErrorResponse extends ApiResponse<{ message: string; code: number; }> {}

/**
 * Paginated query response helper
 */
export interface PaginatedQueryParams {
  page?: number;
  pageSize?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<{
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}> {}

/**
 * Response with pagination support
 */
export type PaginatedApiResponse<T> = ApiResponse<T> & {
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

// ============================================
// Execution Module Types
// ============================================

/**
 * Execution Run - represents an agent execution instance
 */
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

/**
 * Execution Step - individual step in an execution run
 */
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

/**
 * Execution Artifact - output from an execution step
 */
export interface ExecutionArtifact {
  id: string;
  executionRunId: string;
  artifactType: 'file' | 'code' | 'image' | 'document' | 'other';
  name: string;
  path?: string;
  content?: string;
  createdAt: string;
}

/**
 * Approval Request - request for human approval
 */
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

/**
 * Approval Action - action to resolve an approval request
 */
export interface ApprovalAction {
  action: 'approve' | 'reject';
  reason?: string;
}

/**
 * Execution Run List Response
 */
export interface ExecutionRunListResponse extends ApiResponse<ExecutionRun[]> {}

/**
 * Approval Request List Response
 */
export interface ApprovalRequestListResponse extends ApiResponse<ApprovalRequest[]> {}

// ============================================
// Runtime Module Types
// ============================================

/**
 * Runtime - represents a registered AI agent runtime
 */
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

/**
 * Runtime Capability - ability of a runtime
 */
export interface RuntimeCapability {
  type: 'file' | 'git' | 'terminal' | 'process' | 'credentials' | 'cli';
  enabled: boolean;
  version?: string;
  config?: Record<string, unknown>;
}

/**
 * Runtime Session - active session with a runtime
 */
export interface RuntimeSession {
  id: string;
  runtimeId: string;
  userId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastActivity?: string;
}

/**
 * Runtime List Response
 */
export interface RuntimeListResponse extends ApiResponse<Runtime[]> {}

// ============================================
// Document Module Types
// ============================================

/**
 * Document - project document
 */
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

/**
 * Document Version - historical version of a document
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  createdBy: string;
  createdAt: string;
  changeNote?: string;
}

/**
 * Document List Response
 */
export interface DocumentListResponse extends ApiResponse<Document[]> {}
