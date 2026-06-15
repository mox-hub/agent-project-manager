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

const unwrap = <T,>(response: { data: T } | T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
};

export const documentStorageApi = {
  async getConfig(): Promise<StorageConfig> {
    const res = await api.get<StorageConfig>('/documents/storage/config');
    return res.data;
  },

  async updateConfig(updates: Partial<StorageConfig>): Promise<StorageConfig> {
    const res = await api.put<StorageConfig>('/documents/storage/config', updates);
    return res.data;
  },

  async detectDefaultPath(): Promise<string> {
    const res = await api.get<{ path: string }>('/documents/storage/default-path');
    return res.data.path;
  },

  async listFiles(): Promise<StoredFileMeta[]> {
    const res = await api.get<{ data: StoredFileMeta[] } | StoredFileMeta[]>('/documents/storage/files');
    return unwrap(res.data);
  },

  async loadDocument(id: string): Promise<string> {
    const res = await api.get<{ data: { content: string } } | { content: string }>(`/documents/${id}/storage`);
    const data = unwrap(res.data);
    return (data as any).content;
  },

  async saveDocument(id: string, content: string): Promise<StoredFileMeta> {
    const res = await api.post<{ data: StoredFileMeta } | StoredFileMeta>(`/documents/${id}/storage`, { content });
    return unwrap(res.data);
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await api.post<{ data: { deleted: boolean } } | { deleted: boolean }>(`/documents/${id}/storage/delete`);
    const data = unwrap(res.data);
    return (data as any).deleted;
  },
};
