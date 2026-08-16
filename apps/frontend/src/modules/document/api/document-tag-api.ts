import { api } from '@/infrastructure/api-client';

export interface DocumentTag {
  id: string;
  name: string;
  projectId?: string | null;
  color?: string | null;
  description?: string | null;
  resourceTypes?: string[] | null;
  createdAt: string;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateTagRequest {
  name: string;
  projectId?: string;
  color?: string;
  description?: string;
  resourceTypes?: string[];
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
  resourceTypes?: string[];
}

export const documentTagApi = {
  async listAll(projectId?: string): Promise<DocumentTag[]> {
    return api.get<DocumentTag[]>(
      '/documents/tags',
      projectId ? { projectId } : undefined,
    );
  },

  async create(data: CreateTagRequest): Promise<DocumentTag> {
    return api.post<DocumentTag>('/documents/tags', data);
  },

  async update(id: string, data: UpdateTagRequest): Promise<DocumentTag> {
    return api.put<DocumentTag>(`/documents/tags/${id}`, data);
  },

  async delete(id: string): Promise<{ id: string }> {
    return api.delete<{ id: string }>(`/documents/tags/${id}`);
  },

  async listForDocument(documentId: string): Promise<DocumentTag[]> {
    return api.get<DocumentTag[]>(`/documents/${documentId}/tags`);
  },

  async attachToDocument(documentId: string, tagId: string): Promise<void> {
    await api.post(`/documents/${documentId}/tags`, { tagId });
  },

  async detachFromDocument(documentId: string, tagId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/tags/${tagId}`);
  },
};
