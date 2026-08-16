// Document Task Link API - 前端 API 调用
import { api } from '@/infrastructure/api-client';

export type LinkType = 'references' | 'blocks' | 'relates' | 'implements';

export interface DocumentTaskLink {
  id: string;
  documentId: string | null;
  sectionId: string | null;
  taskId: string;
  projectId: string;
  linkType: LinkType;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // 关联的任务信息（可选）
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    shortId?: string | null;
  };
  // 关联的文档信息（任务侧拉取时填充）
  document?: {
    id: string;
    title: string;
  } | null;
  // 关联的段落信息
  section?: {
    id: string;
    title: string;
    anchor: string;
  } | null;
}

export interface CreateTaskLinkDto {
  taskId: string;
  projectId: string;
  documentId?: string;
  sectionId?: string;
  linkType?: LinkType;
  note?: string;
}

export interface LinkStats {
  totalLinks: number;
  byType: Record<string, number>;
  byProject: Record<string, number>;
}

// ========== 文档侧 API ==========

/**
 * 获取文档关联的任务
 */
export async function fetchDocumentLinks(documentId: string): Promise<DocumentTaskLink[]> {
  const res = await api.get<DocumentTaskLink[]>(`/documents/${documentId}/links`);
  return res;
}

/**
 * 添加任务关联
 */
export async function createDocumentLink(
  documentId: string,
  data: CreateTaskLinkDto,
): Promise<DocumentTaskLink> {
  const res = await api.post<DocumentTaskLink>(`/documents/${documentId}/links`, data);
  return res;
}

/**
 * 删除任务关联
 */
export async function deleteDocumentLink(linkId: string): Promise<void> {
  await api.delete(`/documents/links/${linkId}`);
}

/**
 * 更新关联类型
 */
export async function updateLinkType(
  linkId: string,
  linkType: LinkType,
): Promise<DocumentTaskLink> {
  const res = await api.put<DocumentTaskLink>(`/documents/links/${linkId}/type`, { linkType });
  return res;
}

/**
 * 获取关联统计
 */
export async function fetchLinkStats(documentId: string): Promise<LinkStats> {
  const res = await api.get<LinkStats>(`/documents/${documentId}/links/stats`);
  return res;
}

/**
 * 批量创建关联
 */
export async function createLinksBatch(
  documentId: string,
  links: CreateTaskLinkDto[],
): Promise<DocumentTaskLink[]> {
  const res = await api.post<DocumentTaskLink[]>(`/documents/${documentId}/links/batch`, { links });
  return res;
}

// ========== 章节侧 API ==========

/**
 * 获取章节关联的任务
 */
export async function fetchSectionLinks(sectionId: string): Promise<DocumentTaskLink[]> {
  const res = await api.get<DocumentTaskLink[]>(`/documents/sections/${sectionId}/links`);
  return res;
}

/**
 * 添加章节任务关联
 */
export async function createSectionLink(
  sectionId: string,
  data: CreateTaskLinkDto,
): Promise<DocumentTaskLink> {
  const res = await api.post<DocumentTaskLink>(`/documents/sections/${sectionId}/links`, data);
  return res;
}

/**
 * 删除章节任务关联
 */
export async function deleteSectionLink(linkId: string): Promise<void> {
  await api.delete(`/documents/sections/links/${linkId}`);
}

// ========== 任务侧 API ==========

/**
 * 获取任务关联的文档
 */
export async function fetchTaskDocumentLinks(taskId: string): Promise<DocumentTaskLink[]> {
  const res = await api.get<DocumentTaskLink[]>(`/documents/tasks/${taskId}/document-links`);
  return res;
}

// ========== 项目侧 API ==========

/**
 * 获取项目关联的文档
 */
export async function fetchProjectDocumentLinks(projectId: string): Promise<DocumentTaskLink[]> {
  const res = await api.get<DocumentTaskLink[]>(`/documents/projects/${projectId}/document-links`);
  return res;
}
