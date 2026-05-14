// Document Section Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDocumentSections,
  fetchSectionsTree,
  fetchSection,
  fetchSectionByAnchor,
  createSection,
  updateSection,
  deleteSection,
  refreshSections,
  type DocumentSection,
} from '../api/document-section-api';

const SECTION_KEYS = {
  all: ['documents', 'sections'] as const,
  lists: () => [...SECTION_KEYS.all, 'list'] as const,
  list: (documentId: string) => [...SECTION_KEYS.lists(), { documentId }] as const,
  trees: () => [...SECTION_KEYS.all, 'tree'] as const,
  tree: (documentId: string) => [...SECTION_KEYS.trees(), { documentId }] as const,
  details: () => [...SECTION_KEYS.all, 'detail'] as const,
  detail: (sectionId: string) => [...SECTION_KEYS.details(), sectionId] as const,
};

/**
 * 获取文档所有章节
 */
export function useDocumentSections(documentId: string) {
  return useQuery({
    queryKey: SECTION_KEYS.list(documentId),
    queryFn: () => fetchDocumentSections(documentId),
    enabled: !!documentId,
  });
}

/**
 * 获取章节嵌套结构
 */
export function useSectionsTree(documentId: string) {
  return useQuery({
    queryKey: SECTION_KEYS.tree(documentId),
    queryFn: () => fetchSectionsTree(documentId),
    enabled: !!documentId,
  });
}

/**
 * 获取单个章节
 */
export function useSection(sectionId: string) {
  return useQuery({
    queryKey: SECTION_KEYS.detail(sectionId),
    queryFn: () => fetchSection(sectionId),
    enabled: !!sectionId,
  });
}

/**
 * 根据锚点获取章节
 */
export function useSectionByAnchor(documentId: string, anchor: string) {
  return useQuery({
    queryKey: [...SECTION_KEYS.all, 'anchor', documentId, anchor] as const,
    queryFn: () => fetchSectionByAnchor(documentId, anchor),
    enabled: !!documentId && !!anchor,
  });
}

/**
 * 创建章节
 */
export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string;
      data: Parameters<typeof createSection>[1];
    }) => createSection(documentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SECTION_KEYS.list(variables.documentId) });
      queryClient.invalidateQueries({ queryKey: SECTION_KEYS.tree(variables.documentId) });
    },
  });
}

/**
 * 更新章节
 */
export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sectionId,
      data,
    }: {
      sectionId: string;
      data: Parameters<typeof updateSection>[1];
    }) => updateSection(sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECTION_KEYS.all });
    },
  });
}

/**
 * 删除章节
 */
export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sectionId: string) => deleteSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECTION_KEYS.all });
    },
  });
}

/**
 * 刷新章节索引
 */
export function useRefreshSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      content,
    }: {
      documentId: string;
      content: string;
    }) => refreshSections(documentId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SECTION_KEYS.list(variables.documentId) });
      queryClient.invalidateQueries({ queryKey: SECTION_KEYS.tree(variables.documentId) });
    },
  });
}

/**
 * 辅助函数：从 URL 提取锚点
 */
export function extractAnchorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  return hash.startsWith('#') ? hash.slice(1) : null;
}

/**
 * 辅助函数：生成章节 URL
 */
export function generateSectionUrl(documentId: string, anchor: string): string {
  return `/app/documents/${documentId}#${anchor}`;
}
