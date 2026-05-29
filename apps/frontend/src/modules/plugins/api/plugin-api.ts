import { api } from '@/infrastructure/api-client';

export interface PluginInfo {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  enabled: boolean;
  scope: 'global' | 'project';
  manifest?: PluginManifest;
  installedAt: string;
  updatedAt: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions: string[];
  entryPoint?: string;
  dependencies?: Record<string, string>;
}

export interface PluginListParams {
  scope?: 'global' | 'project';
  projectId?: string;
  enabled?: boolean;
}

export const pluginApi = {
  getPlugins: (params?: PluginListParams) =>
    api.get<PluginInfo[]>('/plugins', params),

  getPlugin: (id: string) =>
    api.get<PluginInfo>(`/plugins/${id}`),

  installPlugin: (data: { manifestUrl: string; scope?: 'global' | 'project'; projectId?: string }) =>
    api.post<PluginInfo>('/plugins', data),

  enablePlugin: (id: string) =>
    api.post<Plugin>(`/plugins/${id}/enable`),

  disablePlugin: (id: string) =>
    api.post<Plugin>(`/plugins/${id}/disable`),

  uninstallPlugin: (id: string) =>
    api.delete<void>(`/plugins/${id}`),

  getPluginManifest: (url: string) =>
    api.get<PluginManifest>(`/plugins/manifest?url=${encodeURIComponent(url)}`),
};
