/**
 * Runtime 协议镜像
 *
 * 与 apps/server/src/modules/runtime/ 的端点 / DTO / WS 事件保持同步。
 * 新增协议字段时需同步更新此处与 server 端。
 */

// ---------- 端点 ----------
export const RUNTIME_ENDPOINTS = {
  REGISTER: '/runtime/register',
  capabilities: (runtimeId: string) => `/runtime/${runtimeId}/capabilities`,
  heartbeat: (runtimeId: string) => `/runtime/${runtimeId}/heartbeat`,
  dispatches: (runtimeId: string) => `/runtime/${runtimeId}/dispatches`,
  executionContext: (executionRunId: string) =>
    `/runtime/executions/${executionRunId}/context`,
  executionEvents: (executionRunId: string) =>
    `/runtime/executions/${executionRunId}/events`,
  executionResult: (executionRunId: string) =>
    `/runtime/executions/${executionRunId}/result`,
  approvalRequest: (executionRunId: string) =>
    `/runtime/executions/${executionRunId}/approval-request`,
} as const;

// ---------- WebSocket ----------
export const WS_NAMESPACE = '/runtime/ws';

export const WS_EVENTS = {
  serverToRuntime: {
    CONNECTED: 'runtime:connected',
    DISCONNECTED: 'runtime:disconnected',
    DISPATCH_CREATED: 'runtime:dispatch.created',
    APPROVAL_RESOLVED: 'runtime:approval.resolved',
    EXECUTION_CANCELLED: 'runtime:execution.cancelled',
  },
  runtimeToServer: {
    HEARTBEAT: 'runtime:heartbeat',
  },
} as const;

// ---------- 常量 ----------
export const HEARTBEAT_INTERVAL_SECONDS = 30;
export const POLL_INTERVAL_MS = 15000;
export const WS_RECONNECT_BASE_MS = 1000;
export const WS_RECONNECT_MAX_MS = 60000;
export const DEFAULT_DISPATCH_LIMIT = 20;

// ---------- DTO ----------
export interface RuntimeRegisterPayload {
  runtimeId: string;
  deviceId: string;
  hostPlatform: string;
  runtimeVersion: string;
  protocolVersion: string;
  workspaceRoots: string[];
  availableProviders: string[];
  cliProviders: string[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeRegistrationResult {
  runtimeSessionId: string;
  runtimeSessionToken: string;
  websocketEndpoint: string;
  heartbeatIntervalSeconds: number;
  serverTime: string;
}

export interface RuntimeCapabilitiesPayload {
  workspaceRoots: string[];
  providers: Record<string, unknown>;
  cliProviders: string[];
  capabilityFlags?: Record<string, unknown>;
  policyConstraints?: Record<string, unknown>;
}

export interface RuntimeHeartbeatPayload {
  runtimeSessionId: string;
  status: 'online' | 'offline';
  activeExecutionIds?: string[];
}

/** 派发记录（镜像 server RuntimeDispatchRecord + Phase C 执行载荷扩展） */
export interface RuntimeDispatch {
  executionRunId: string;
  projectId?: string;
  taskId?: string;
  subjectType?: string;
  subjectId?: string;
  contextPackRef?: string;
  requestedActions?: string[];
  toolScopes?: string[];
  approvalState?: string;
  policySnapshot?: Record<string, unknown>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  // 执行载荷（Phase C 扩展）
  prompt?: string;
  workspaceRoot?: string;
  providerId?: string;
  model?: string;
  allowedTools?: string[];
  timeout?: number;
}

/** 执行上下文（getExecutionContext 返回，含执行载荷） */
export interface ExecutionContextPayload {
  executionRunId: string;
  projectId: string;
  taskId?: string;
  goal?: string;
  input?: {
    task?: { id?: string; title?: string; description?: string | null };
    context?: unknown;
    model?: string;
    allowedTools?: string[];
    prompt?: string;
    workspaceRoot?: string;
    providerId?: string;
    timeout?: number;
  };
}

export interface ExecutionEventPayload {
  eventType: string;
  runtimeId: string;
  stepId?: string;
  status?: string;
  summary?: string;
  artifactRefs?: string[];
  evidenceRefs?: string[];
  errorCode?: string;
  timestamp?: string;
}

export interface RefItem {
  type: string;
  ref: string;
}

export interface ExecutionResultPayload {
  status: string;
  summary: string;
  artifacts?: RefItem[];
  evidence?: RefItem[];
  error?: Record<string, unknown> | null;
}

export interface ApprovalRequestPayload {
  requestedAction: string;
  riskLevel: string;
  reason: string;
  stepId?: string;
}

// ---------- 事件类型名 ----------
export const EXECUTION_EVENT_TYPES = {
  STEP_UPDATED: 'execution.step.updated',
  TOKEN: 'execution.token',
  STARTED: 'execution.started',
} as const;
