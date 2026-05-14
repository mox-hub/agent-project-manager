// Document Task Link Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDocumentLinks,
  createDocumentLink,
  deleteDocumentLink,
  updateLinkType,
  fetchLinkStats,
  createLinksBatch,
  fetchSectionLinks,
  createSectionLink,
  fetchTaskDocumentLinks,
  fetchProjectDocumentLinks,
  type DocumentTaskLink,
  type CreateTaskLinkDto,
  type LinkType,
} from '../api/document-task-link-api';

const LINK_KEYS = {
  all: ['document-links'] as const,
  documentLinks: (documentId: string) => [...LINK_KEYS.all, 'document', documentId] as const,
  sectionLinks: (sectionId: string) => [...LINK_KEYS.all, 'section', sectionId] as const,
  taskLinks: (taskId: string) => [...LINK_KEYS.all, 'task', taskId] as const,
  projectLinks: (projectId: string) => [...LINK_KEYS.all, 'project', projectId] as const,
};

// ========== 文档侧 Hooks ==========

/**
 * 获取文档关联的任务
 */
export function useDocumentLinks(documentId: string) {
  return useQuery({
    queryKey: LINK_KEYS.documentLinks(documentId),
    queryFn: () => fetchDocumentLinks(documentId),
    enabled: !!documentId,
  });
}

/**
 * 添加任务关联
 */
export function useCreateDocumentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string;
      data: CreateTaskLinkDto;
    }) => createDocumentLink(documentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LINK_KEYS.documentLinks(variables.documentId) });
    },
  });
}

/**
 * 删除任务关联
 */
export function useDeleteDocumentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      linkId,
    }: {
      documentId: string;
      linkId: string;
    }) => deleteDocumentLink(linkId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LINK_KEYS.documentLinks(variables.documentId) });
    },
  });
}

/**
 * 更新关联类型
 */
export function useUpdateLinkType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      linkId,
      linkType,
    }: {
      documentId: string;
      linkId: string;
      linkType: LinkType;
    }) => updateLinkType(linkId, linkType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LINK_KEYS.documentLinks(variables.documentId) });
    },
  });
}

/**
 * 获取关联统计
 */
export function useLinkStats(documentId: string) {
  return useQuery({
    queryKey: [...LINK_KEYS.documentLinks(documentId), 'stats'] as const,
    queryFn: () => fetchLinkStats(documentId),
    enabled: !!documentId,
  });
}

/**
 * 批量创建关联
 */
export function useCreateLinksBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      links,
    }: {
      documentId: string;
      links: CreateTaskLinkDto[];
    }) => createLinksBatch(documentId, links),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LINK_KEYS.documentLinks(variables.documentId) });
    },
  });
}

// ========== 章节侧 Hooks ==========

/**
 * 获取章节关联的任务
 */
export function useSectionLinks(sectionId: string) {
  return useQuery({
    queryKey: LINK_KEYS.sectionLinks(sectionId),
    queryFn: () => fetchSectionLinks(sectionId),
    enabled: !!sectionId,
  });
}

/**
 * 添加章节任务关联
 */
export function useCreateSectionLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sectionId,
      data,
    }: {
      sectionId: string;
      data: CreateTaskLinkDto;
    }) => createSectionLink(sectionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LINK_KEYS.sectionLinks(variables.sectionId) });
    },
  });
}

// ========== 任务侧 Hooks ==========

/**
 * 获取任务关联的文档
 */
export function useTaskDocumentLinks(taskId: string) {
  return useQuery({
    queryKey: LINK_KEYS.taskLinks(taskId),
    queryFn: () => fetchTaskDocumentLinks(taskId),
    enabled: !!taskId,
  });
}

// ========== 项目侧 Hooks ==========

/**
 * 获取项目关联的文档
 */
export function useProjectDocumentLinks(projectId: string) {
  return useQuery({
    queryKey: LINK_KEYS.projectLinks(projectId),
    queryFn: () => fetchProjectDocumentLinks(projectId),
    enabled: !!projectId,
  });
}

/**
 * 关联类型标签映射
 */
export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  references: '引用',
  blocks: '阻塞',
  relates: '相关',
  implements: '实现',
};

/**
 * 关联类型颜色映射
 */
export const LINK_TYPE_COLORS: Record<LinkType, string> = {
  references: 'text-blue-500',
  blocks: 'text-red-500',
  relates: 'text-gray-500',
  implements: 'text-green-500',
};
