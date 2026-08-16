// Document Section API - 前端 API 调用
import { api } from '@/infrastructure/api-client';

export interface DocumentSection {
  id: string;
  documentId: string;
  title: string;
  level: number;
  anchor: string;
  content: string | null;
  order: number;
  parentId: string | null;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  children?: DocumentSection[];
}

export interface CreateSectionDto {
  title: string;
  level?: number;
  anchor?: string;
  content?: string;
  order?: number;
  parentId?: string;
}

export interface UpdateSectionDto {
  title?: string;
  level?: number;
  anchor?: string;
  content?: string;
  parentId?: string;
}

/**
 * 获取文档的所有章节
 */
export async function fetchDocumentSections(documentId: string): Promise<DocumentSection[]> {
  const res = await api.get<DocumentSection[]>(`/documents/${documentId}/sections`);
  return res;
}

/**
 * 获取章节嵌套结构
 */
export async function fetchSectionsTree(documentId: string): Promise<DocumentSection[]> {
  const res = await api.get<DocumentSection[]>(`/documents/${documentId}/sections/tree`);
  return res;
}

/**
 * 获取单个章节
 */
export async function fetchSection(sectionId: string): Promise<DocumentSection> {
  const res = await api.get<DocumentSection>(`/documents/${sectionId}`);
  return res;
}

/**
 * 根据锚点获取章节
 */
export async function fetchSectionByAnchor(
  documentId: string,
  anchor: string,
): Promise<DocumentSection | null> {
  const res = await api.get<DocumentSection | null>(`/documents/${documentId}/sections/anchor/${anchor}`);
  return res;
}

/**
 * 创建章节
 */
export async function createSection(
  documentId: string,
  data: Omit<CreateSectionDto, 'documentId'>,
): Promise<DocumentSection> {
  const res = await api.post<DocumentSection>(`/documents/${documentId}/sections`, data);
  return res;
}

/**
 * 更新章节
 */
export async function updateSection(
  sectionId: string,
  data: UpdateSectionDto,
): Promise<DocumentSection> {
  const res = await api.put<DocumentSection>(`/documents/${sectionId}/sections`, data);
  return res;
}

/**
 * 删除章节
 */
export async function deleteSection(sectionId: string): Promise<void> {
  await api.delete(`/documents/${sectionId}/sections`);
}

/**
 * 从 Markdown 内容刷新章节索引
 */
export async function refreshSections(
  documentId: string,
  content: string,
): Promise<DocumentSection[]> {
  const res = await api.post<DocumentSection[]>(`/documents/${documentId}/sections/refresh`, { content });
  return res;
}
