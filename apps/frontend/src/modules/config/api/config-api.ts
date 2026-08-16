import { api } from '@/infrastructure/api-client';

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

export type ConfigValues = Record<string, any>;

export const configApi = {
  /**
   * Get configuration values
   */
  async getConfig(params: GetConfigParams): Promise<ConfigValues> {
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

    return api.get<ConfigValues>(`/config?${queryParams.toString()}`);
  },

  /**
   * Set configuration values
   */
  async setConfig(params: SetConfigParams): Promise<ConfigValues> {
    return api.put<ConfigValues>('/config', params);
  },

  /**
   * Delete configuration keys
   */
  async deleteConfig(params: DeleteConfigParams): Promise<void> {
    return api.delete<void>('/config', { data: params });
  },
};
