import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf, ApiSchemas } from '@/infrastructure/api-client/contract';

/**
 * 响应类型单源于 openapi 契约（components.schemas 响应 DTO，服务端
 * @ApiOkResponse 声明）。DocumentVersion / DocumentListQuery 暂留手写：
 * 前者契约未声明版本响应，后者带 'all' 筛选语义扩展。
 */
export type DocumentStatus = ApiSchemas['DocumentResponseDto']['status'];

export type DocumentCategory = ApiSchemas['DocumentResponseDto']['category'];

/** 文档详情（findOne/create/update 返回：含 folder/project/sections/_count） */
export type Document = ApiSchemas['DocumentDetailResponseDto'];

/** 列表行（findAll 分页 data 元素：folder/project 仅摘要 + _count） */
export type DocumentListItem = ApiSchemas['DocumentListItemDto'];

/** 分页信封（findAll 裸数据口径即 { data, meta }） */
export type DocumentPage = ApiSchemas['DocumentPageResponseDto'];

export type DocumentStats = ApiSchemas['DocumentStatsResponseDto'];

export type DocumentSyncWarning = ApiSchemas['SyncWarningResponseDto'];

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

export type DocumentListQuery = {
  q?: string;
  category?: DocumentCategory | 'all';
  status?: DocumentStatus | 'all';
  folderId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateDocumentRequest = RequestBodyOf<'DocumentController_create'>;

export type UpdateDocumentRequest = RequestBodyOf<'DocumentController_update'>;

export const documentApi = {
  // Document CRUD
  getList: async (query?: DocumentListQuery): Promise<DocumentPage> => {
    return api.get<DocumentPage>('/documents', query);
  },

  getDetail: async (documentId: string): Promise<Document> => {
    return api.get<Document>(`/documents/${documentId}`);
  },

  create: async (data: CreateDocumentRequest): Promise<Document> => {
    return api.post<Document>('/documents', data);
  },

  update: async (documentId: string, data: UpdateDocumentRequest): Promise<Document> => {
    return api.put<Document>(`/documents/${documentId}`, data);
  },

  delete: async (documentId: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/documents/${documentId}`);
  },

  restore: async (documentId: string): Promise<ApiSchemas['DocumentResponseDto']> => {
    return api.post<ApiSchemas['DocumentResponseDto']>(`/documents/${documentId}/restore`, {});
  },

  getStats: async (projectId?: string): Promise<DocumentStats> => {
    return api.get<DocumentStats>('/documents/stats', projectId ? { projectId } : undefined);
  },
};

export const documentSyncApi = {
  getWarnings: async (): Promise<DocumentSyncWarning[]> => {
    return api.get<DocumentSyncWarning[]>('/documents/sync/warnings');
  },
  clearWarning: async (documentId: string): Promise<{ cleared: boolean }> => {
    return api.post<{ cleared: boolean }>(`/documents/sync/warnings/${documentId}/clear`, {});
  },
};

// Folder API（列表行 / 树节点 / 详情三态均为独立契约 DTO）
export type DocumentFolder = ApiSchemas['DocumentFolderListItemDto'];
export type DocumentFolderTree = ApiSchemas['DocumentFolderTreeNodeDto'];
export type DocumentFolderDetail = ApiSchemas['DocumentFolderDetailResponseDto'];

export type CreateFolderRequest = RequestBodyOf<'FolderController_create'>;

export type UpdateFolderRequest = RequestBodyOf<'FolderController_update'>;

export const folderApi = {
  getList: async (projectId?: string): Promise<DocumentFolder[]> => {
    return api.get<DocumentFolder[]>('/documents/folders', projectId ? { projectId } : undefined);
  },

  getTree: async (projectId?: string): Promise<DocumentFolderTree[]> => {
    return api.get<DocumentFolderTree[]>('/documents/folders/tree', projectId ? { projectId } : undefined);
  },

  getById: async (folderId: string): Promise<DocumentFolderDetail> => {
    return api.get<DocumentFolderDetail>(`/documents/folders/${folderId}`);
  },

  create: async (data: CreateFolderRequest): Promise<DocumentFolder> => {
    return api.post<DocumentFolder>('/documents/folders', data);
  },

  update: async (folderId: string, data: UpdateFolderRequest): Promise<DocumentFolder> => {
    return api.put<DocumentFolder>(`/documents/folders/${folderId}`, data);
  },

  delete: async (folderId: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/documents/folders/${folderId}`);
  },
};

// Approval API
export type DocumentApproval = ApiSchemas['ApprovalResponseDto'];

export type ApprovalQuery = {
  status?: 'pending' | 'approved' | 'rejected';
  documentId?: string;
  submitterId?: string;
};

export const approvalApi = {
  submitForReview: async (
    documentId: string,
    comment?: string,
  ): Promise<DocumentApproval> => {
    return api.post<DocumentApproval>(`/documents/${documentId}/approval`, { comment });
  },

  getList: async (query?: ApprovalQuery): Promise<DocumentApproval[]> => {
    return api.get<DocumentApproval[]>('/documents/approvals', query);
  },

  getPending: async (myDocuments?: boolean): Promise<DocumentApproval[]> => {
    return api.get<DocumentApproval[]>('/documents/approvals/pending', myDocuments ? { myDocuments: 'true' } : undefined);
  },

  getById: async (approvalId: string): Promise<DocumentApproval> => {
    return api.get<DocumentApproval>(`/documents/approvals/${approvalId}`);
  },

  resolve: async (
    approvalId: string,
    status: 'approved' | 'rejected',
    comment?: string,
  ): Promise<DocumentApproval> => {
    return api.post<DocumentApproval>(`/documents/approvals/${approvalId}/resolve`, { status, comment });
  },

  cancel: async (approvalId: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/documents/approvals/${approvalId}`);
  },
};
