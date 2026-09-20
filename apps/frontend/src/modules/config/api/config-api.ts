import { api } from '@/infrastructure/api-client';
import type { QueryOf, RequestBodyOf } from '@/infrastructure/api-client/contract';

export type ConfigScope = 'global' | 'project' | 'user';

/**
 * 请求侧类型单源于 openapi 契约（SetConfigDto.config 现为开放键值对象
 * additionalProperties:true，与调用方 Record<string, any> 传参兼容）。
 */
export type GetConfigParams = QueryOf<'ConfigController_getConfig'>;

export type SetConfigParams = RequestBodyOf<'ConfigController_setConfig'>;

export type DeleteConfigParams = RequestBodyOf<'ConfigController_deleteConfig'>;

export type ConfigValues = Record<string, unknown>;

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
