// Document Version API - 前端 API 调用
import { api } from '@/infrastructure/api-client';

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  content: string;
  sectionsJson: string | null;
  summary: string | null;
  wordCount: number;
  createdBy: string;
  createdAt: string;
}

export interface CreateVersionDto {
  content: string;
  summary?: string;
}

export interface VersionCompare {
  v1: DocumentVersion;
  v2: DocumentVersion;
  contentDiff: string;
  addedSections: string[];
  removedSections: string[];
  modifiedSections: string[];
}

export interface VersionStats {
  totalVersions: number;
  latestVersion: string | null;
  oldestVersion: string | null;
  wordCountChange: number;
}

/**
 * 获取版本历史
 */
export async function fetchVersions(documentId: string): Promise<DocumentVersion[]> {
  const res = await api.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
  return res.data;
}

/**
 * 获取最新版本
 */
export async function fetchLatestVersion(documentId: string): Promise<DocumentVersion | null> {
  const res = await api.get<DocumentVersion | null>(`/documents/${documentId}/versions/latest`);
  return res.data;
}

/**
 * 获取特定版本
 */
export async function fetchVersion(
  versionId: string,
  documentId: string,
): Promise<DocumentVersion> {
  const res = await api.get<DocumentVersion>(
    `/documents/${documentId}/versions/${versionId}`,
  );
  return res.data;
}

/**
 * 创建新版本
 */
export async function createVersion(
  documentId: string,
  data: CreateVersionDto,
  createdBy: string,
): Promise<DocumentVersion> {
  const params = new URLSearchParams({ createdBy }).toString();
  const res = await api.post<DocumentVersion>(
    `/documents/${documentId}/versions?${params}`,
    data,
  );
  return res.data;
}

/**
 * 回滚到指定版本
 */
export async function rollbackToVersion(
  documentId: string,
  versionId: string,
  createdBy: string,
): Promise<DocumentVersion> {
  const params = new URLSearchParams({ createdBy }).toString();
  const res = await api.post<DocumentVersion>(
    `/documents/${documentId}/versions/rollback?${params}`,
    { versionId },
  );
  return res.data;
}

/**
 * 获取版本统计
 */
export async function fetchVersionStats(documentId: string): Promise<VersionStats> {
  const res = await api.get<VersionStats>(`/documents/${documentId}/versions/stats`);
  return res.data;
}

/**
 * 重命名版本
 */
export async function renameVersion(
  documentId: string,
  versionId: string,
  label: string,
): Promise<DocumentVersion> {
  const res = await api.put<DocumentVersion>(
    `/documents/${documentId}/versions/${versionId}`,
    { label },
  );
  return res.data;
}
