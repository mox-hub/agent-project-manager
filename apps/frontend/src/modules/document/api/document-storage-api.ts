import { api } from '@/infrastructure/api-client';

export interface StorageConfig {
  basePath: string;
  autoSync: boolean;
  syncOnUpdate: boolean;
  fileExtension: 'md' | 'mdx';
  defaultSubfolder: string;
}

export interface StoredFileMeta {
  documentId: string;
  fileName: string;
  fullPath: string;
  size: number;
  modifiedAt: string;
}

export const documentStorageApi = {
  async getConfig(): Promise<StorageConfig> {
    const res = await api.get<StorageConfig>('/documents/storage/config');
    return res;
  },

  async updateConfig(updates: Partial<StorageConfig>): Promise<StorageConfig> {
    const res = await api.put<StorageConfig>('/documents/storage/config', updates);
    return res;
  },

  async detectDefaultPath(): Promise<string> {
    const res = await api.get<{ path: string }>('/documents/storage/default-path');
    return res.path;
  },

  async listFiles(): Promise<StoredFileMeta[]> {
    return api.get<StoredFileMeta[]>('/documents/storage/files');
  },

  async loadDocument(id: string): Promise<string> {
    const res = await api.get<{ content: string }>(`/documents/${id}/storage`);
    return res.content;
  },

  async saveDocument(id: string, content: string): Promise<StoredFileMeta> {
    return api.post<StoredFileMeta>(`/documents/${id}/storage`, { content });
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await api.post<{ deleted: boolean }>(`/documents/${id}/storage/delete`);
    return res.deleted;
  },
};
