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
