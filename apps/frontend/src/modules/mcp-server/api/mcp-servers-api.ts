/**
 * MCP Server / CLI Provider API
 *
 * 与后端 apps/server/src/modules/cli-provider/ 对应的 REST API
 */

import { api } from '@/infrastructure/api-client';

export const CLI_PROVIDER_IDS = ['claude-code', 'codex', 'zcode'] as const;
export type CliProviderId = (typeof CLI_PROVIDER_IDS)[number];

export interface CliProviderStatus {
  providerId: CliProviderId;
  available: boolean;
  version?: string;
  error?: string;
  commandPath: string;
  configuredPath?: string;
  model?: string;
  env?: Record<string, string>;
  allowedTools?: string[];
  enabled: boolean;
  lastDetectedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CliProvidersResponse {
  providers: CliProviderStatus[];
  defaultProvider: CliProviderId | null;
}

export interface ConfigureCliProviderRequest {
  providerId: CliProviderId;
  displayName?: string;
  commandPath?: string;
  model?: string;
  env?: Record<string, string>;
  allowedTools?: string[];
  enabled?: boolean;
}

// ── 外部 MCP Server 接入（/mcp/servers）────────────────────────────────────

export const MCP_TRANSPORTS = ['stdio', 'http', 'sse'] as const;
export type McpTransportType = (typeof MCP_TRANSPORTS)[number];

export interface McpServerStatus {
  id: string;
  name: string;
  description?: string;
  transport: McpTransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  status: 'online' | 'offline' | 'unknown';
  lastError?: string;
  toolCount?: number;
  lastLatencyMs?: number;
  lastPingAt?: string;
  serverName?: string;
  serverVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMcpServerRequest {
  name: string;
  description?: string;
  transport: McpTransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
}

export const mcpServersApi = {
  /** List all CLI providers with status */
  listCliProviders: () =>
    api.get<CliProvidersResponse>('/cli-providers'),

  /** Force re-detection of all providers on the server */
  detectCliProviders: () =>
    api.post<{ providers: CliProviderStatus[] }>('/cli-providers/detect'),

  /** Health check single provider */
  healthCheckCliProvider: (providerId: CliProviderId) =>
    api.get<CliProviderStatus>(`/cli-providers/${providerId}/health`),

  /** Update (upsert) provider config */
  configureCliProvider: (
    providerId: CliProviderId,
    data: ConfigureCliProviderRequest,
  ) => api.put<CliProviderStatus>(`/cli-providers/${providerId}`, data),

  /** Delete provider config (reset to built-in defaults) */
  deleteCliProvider: (providerId: CliProviderId) =>
    api.delete<{ success: boolean }>(`/cli-providers/${providerId}`),

  /** Get MCP server status */
  getMcpStatus: () =>
    api.get<{
      status: string;
      version: string;
      activeSessions: number;
      capabilities: { tools: boolean; resources: boolean; prompts: boolean };
    }>('/mcp/status'),

  // ── 外部 MCP Server 管理 ────────────────────────────────────────────────

  /** List configured external MCP servers with cached status */
  listMcpServers: () =>
    api.get<{ servers: McpServerStatus[] }>('/mcp/servers'),

  /** Add an external MCP server (probes immediately) */
  createMcpServer: (data: SaveMcpServerRequest) =>
    api.post<McpServerStatus>('/mcp/servers', data),

  /** Update an MCP server config (probes after update) */
  updateMcpServer: (id: string, data: SaveMcpServerRequest) =>
    api.put<McpServerStatus>(`/mcp/servers/${id}`, data),

  /** Delete an MCP server config */
  deleteMcpServer: (id: string) =>
    api.delete<{ success: boolean }>(`/mcp/servers/${id}`),

  /** Probe a single MCP server (connect + listTools) */
  refreshMcpServer: (id: string) =>
    api.post<McpServerStatus>(`/mcp/servers/${id}/refresh`),

  /** Probe all enabled MCP servers in parallel */
  refreshAllMcpServers: () =>
    api.post<{ servers: McpServerStatus[] }>('/mcp/servers/refresh-all'),
};

export const PROVIDER_DISPLAY_NAMES: Record<CliProviderId, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  zcode: 'ZCode',
};

export const PROVIDER_DESCRIPTIONS: Record<CliProviderId, string> = {
  'claude-code': 'Anthropic Claude Code CLI',
  codex: 'OpenAI Codex CLI',
  zcode: 'ZCode Local Agent',
};
