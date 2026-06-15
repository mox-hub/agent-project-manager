import type { ApiResponse } from '@/infrastructure/api-client';
import { api } from '@/infrastructure/api-client';

export type DocumentStatus = 'draft' | 'reviewing' | 'published' | 'rejected';

export type DocumentCategory = 'requirement' | 'design' | 'api' | 'testing' | 'guide' | 'custom';

export type Document = {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  category: DocumentCategory;
  status: DocumentStatus;
  folderId?: string;
  projectId?: string;
  authorId: string;
  wordCount: number;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  tags?: string[];
  currentVersion?: string;
  linkCount?: number;
  isAIGenerated?: boolean;
  updatedBy?: string;
  folder?: { id: string; name: string };
  project?: { id: string; name: string; color?: string };
  _count?: {
    sections: number;
    versions: number;
    links: number;
  };
};

export type DocumentListItem = {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  category: DocumentCategory;
  status: DocumentStatus;
  folderId?: string;
  projectId?: string;
  authorId: string;
  wordCount: number;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  tags?: string[];
  currentVersion?: string;
  linkCount?: number;
  isAIGenerated?: boolean;
  updatedBy?: string;
  folder?: { id: string; name: string };
  project?: { id: string; name: string; color?: string };
  _count?: {
    sections: number;
    versions: number;
    links: number;
  };
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  version: string;
  summary?: string;
  content: string;
  wordCount: number;
  createdBy: string;
  createdAt: string;
};

export type DocumentStats = {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  recent: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
  }>;
};

export type DocumentListQuery = {
  q?: string;
  category?: DocumentCategory | 'all';
  status?: DocumentStatus | 'all';
  folderId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateDocumentRequest = {
  title: string;
  content?: string;
  summary?: string;
  category?: DocumentCategory;
  folderId?: string;
  projectId?: string;
  tags?: string[];
};

export type UpdateDocumentRequest = {
  title?: string;
  content?: string;
  summary?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  folderId?: string;
  tags?: string[];
};

export const documentApi = {
  // Document CRUD
  getList: async (query?: DocumentListQuery): Promise<ApiResponse<DocumentListItem[]>> => {
    return api.get<DocumentListItem[]>('/documents', query);
  },

  getDetail: async (documentId: string): Promise<ApiResponse<Document>> => {
    return api.get<Document>(`/documents/${documentId}`);
  },

  create: async (data: CreateDocumentRequest): Promise<ApiResponse<Document>> => {
    return api.post<Document>('/documents', data);
  },

  update: async (documentId: string, data: UpdateDocumentRequest): Promise<ApiResponse<Document>> => {
    return api.put<Document>(`/documents/${documentId}`, data);
  },

  delete: async (documentId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return api.delete<{ success: boolean }>(`/documents/${documentId}`);
  },

  restore: async (documentId: string): Promise<ApiResponse<Document>> => {
    return api.post<Document>(`/documents/${documentId}/restore`, {});
  },

  getStats: async (projectId?: string): Promise<ApiResponse<DocumentStats>> => {
    return api.get<DocumentStats>('/documents/stats', projectId ? { projectId } : undefined);
  },
};

// File sync warnings (本地文件落盘失败预警)
export type DocumentSyncWarning = {
  documentId: string;
  lastError: string;
  attempts: number;
  firstFailedAt: string;
  lastAttemptAt: string;
  resolvedPath?: string;
};

export const documentSyncApi = {
  getWarnings: async (): Promise<ApiResponse<DocumentSyncWarning[]>> => {
    return api.get<DocumentSyncWarning[]>('/documents/sync/warnings');
  },
  clearWarning: async (documentId: string): Promise<ApiResponse<{ cleared: boolean }>> => {
    return api.post<{ cleared: boolean }>(`/documents/sync/warnings/${documentId}/clear`, {});
  },
};

// Folder API
export type DocumentFolder = {
  id: string;
  name: string;
  parentId?: string;
  projectId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    children: number;
  };
  children?: DocumentFolder[];
  documents?: Array<{
    id: string;
    title: string;
    category: DocumentCategory;
    status: DocumentStatus;
    updatedAt: string;
  }>;
};

export type CreateFolderRequest = {
  name: string;
  parentId?: string;
  projectId?: string;
  order?: number;
};

export type UpdateFolderRequest = {
  name?: string;
  parentId?: string;
  order?: number;
};

export const folderApi = {
  getList: async (projectId?: string): Promise<ApiResponse<DocumentFolder[]>> => {
    return api.get<DocumentFolder[]>('/documents/folders', projectId ? { projectId } : undefined);
  },

  getTree: async (projectId?: string): Promise<ApiResponse<DocumentFolder[]>> => {
    return api.get<DocumentFolder[]>('/documents/folders/tree', projectId ? { projectId } : undefined);
  },

  getById: async (folderId: string): Promise<ApiResponse<DocumentFolder>> => {
    return api.get<DocumentFolder>(`/documents/folders/${folderId}`);
  },

  create: async (data: CreateFolderRequest): Promise<ApiResponse<DocumentFolder>> => {
    return api.post<DocumentFolder>('/documents/folders', data);
  },

  update: async (folderId: string, data: UpdateFolderRequest): Promise<ApiResponse<DocumentFolder>> => {
    return api.put<DocumentFolder>(`/documents/folders/${folderId}`, data);
  },

  delete: async (folderId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return api.delete<{ success: boolean }>(`/documents/folders/${folderId}`);
  },
};

// Approval API
export type DocumentApproval = {
  id: string;
  documentId: string;
  status: 'pending' | 'approved' | 'rejected';
  submitterId: string;
  approverId?: string;
  comment?: string;
  version?: string;
  createdAt: string;
  resolvedAt?: string;
  document?: {
    id: string;
    title: string;
    authorId: string;
    status: DocumentStatus;
  };
};

export type ApprovalQuery = {
  status?: 'pending' | 'approved' | 'rejected';
  documentId?: string;
  submitterId?: string;
};

export const approvalApi = {
  submitForReview: async (
    documentId: string,
    comment?: string,
  ): Promise<ApiResponse<DocumentApproval>> => {
    return api.post<DocumentApproval>(`/documents/${documentId}/approval`, { comment });
  },

  getList: async (query?: ApprovalQuery): Promise<ApiResponse<DocumentApproval[]>> => {
    return api.get<DocumentApproval[]>('/documents/approvals', query);
  },

  getPending: async (myDocuments?: boolean): Promise<ApiResponse<DocumentApproval[]>> => {
    return api.get<DocumentApproval[]>('/documents/approvals/pending', myDocuments ? { myDocuments: 'true' } : undefined);
  },

  getById: async (approvalId: string): Promise<ApiResponse<DocumentApproval>> => {
    return api.get<DocumentApproval>(`/documents/approvals/${approvalId}`);
  },

  resolve: async (
    approvalId: string,
    status: 'approved' | 'rejected',
    comment?: string,
  ): Promise<ApiResponse<DocumentApproval>> => {
    return api.post<DocumentApproval>(`/documents/approvals/${approvalId}/resolve`, { status, comment });
  },

  cancel: async (approvalId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return api.delete<{ success: boolean }>(`/documents/approvals/${approvalId}`);
  },
};
