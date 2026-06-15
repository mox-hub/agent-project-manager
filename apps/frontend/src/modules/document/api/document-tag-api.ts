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

const unwrap = <T,>(response: { data: T } | T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
};

export const documentTagApi = {
  async listAll(projectId?: string): Promise<DocumentTag[]> {
    const res = await api.get<{ data: DocumentTag[] } | DocumentTag[]>(
      '/documents/tags',
      projectId ? { projectId } : undefined,
    );
    return unwrap(res.data);
  },

  async create(data: CreateTagRequest): Promise<DocumentTag> {
    const res = await api.post<{ data: DocumentTag } | DocumentTag>('/documents/tags', data);
    return unwrap(res.data);
  },

  async update(id: string, data: UpdateTagRequest): Promise<DocumentTag> {
    const res = await api.put<{ data: DocumentTag } | DocumentTag>(`/documents/tags/${id}`, data);
    return unwrap(res.data);
  },

  async delete(id: string): Promise<{ id: string }> {
    const res = await api.delete<{ data: { id: string } } | { id: string }>(`/documents/tags/${id}`);
    return unwrap(res.data);
  },

  async listForDocument(documentId: string): Promise<DocumentTag[]> {
    const res = await api.get<{ data: DocumentTag[] } | DocumentTag[]>(`/documents/${documentId}/tags`);
    return unwrap(res.data);
  },

  async attachToDocument(documentId: string, tagId: string): Promise<void> {
    await api.post(`/documents/${documentId}/tags`, { tagId });
  },

  async detachFromDocument(documentId: string, tagId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/tags/${tagId}`);
  },
};
