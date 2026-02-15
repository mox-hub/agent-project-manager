import { apiClient } from '@/infrastructure/api-client';

export type ConfigScope = 'global' | 'project' | 'user';

export interface GetConfigParams {
  scope: ConfigScope;
  projectId?: string;
  userId?: string;
  keys?: string[];
}

export interface SetConfigParams {
  scope: ConfigScope;
  projectId?: string;
  userId?: string;
  config: Record<string, any>;
}

export interface DeleteConfigParams {
  scope: ConfigScope;
  projectId?: string;
  userId?: string;
  keys: string[];
}

export interface ConfigResponse {
  data: Record<string, any>;
}

export const configApi = {
  /**
   * Get configuration values
   */
  async getConfig(params: GetConfigParams): Promise<ConfigResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('scope', params.scope);
    if (params.projectId) {
      queryParams.append('projectId', params.projectId);
    }
    if (params.userId) {
      queryParams.append('userId', params.userId);
    }
    if (params.keys && params.keys.length > 0) {
      params.keys.forEach((key) => queryParams.append('keys', key));
    }

    return apiClient.get<ConfigResponse>(`/config?${queryParams.toString()}`);
  },

  /**
   * Set configuration values
   */
  async setConfig(params: SetConfigParams): Promise<ConfigResponse> {
    return apiClient.put<ConfigResponse>('/config', params);
  },

  /**
   * Delete configuration keys
   */
  async deleteConfig(params: DeleteConfigParams): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>('/config', {
      data: params,
    });
  },
};
