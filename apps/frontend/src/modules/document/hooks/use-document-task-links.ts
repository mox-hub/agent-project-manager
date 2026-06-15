// Document Task Link Hooks
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useToastMutation } from '@/shared/hooks';

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

  return useToastMutation<DocumentTaskLink, Error, { documentId: string; data: CreateTaskLinkDto }>({
    successMessage: '任务关联已添加',
    errorPrefix: '添加任务关联',
    mutationFn: ({ documentId, data }) => createDocumentLink(documentId, data),
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

  return useToastMutation<unknown, Error, { documentId: string; linkId: string }>({
    successMessage: '任务关联已删除',
    errorPrefix: '删除任务关联',
    mutationFn: ({ linkId }) => deleteDocumentLink(linkId),
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

  return useToastMutation<DocumentTaskLink, Error, { documentId: string; linkId: string; linkType: LinkType }>({
    successMessage: '关联类型已更新',
    errorPrefix: '更新关联类型',
    mutationFn: ({ linkId, linkType }) => updateLinkType(linkId, linkType),
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

  return useToastMutation<DocumentTaskLink[], Error, { documentId: string; links: CreateTaskLinkDto[] }>({
    successMessage: '批量关联已创建',
    errorPrefix: '批量创建关联',
    mutationFn: ({ documentId, links }) => createLinksBatch(documentId, links),
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

  return useToastMutation<DocumentTaskLink, Error, { sectionId: string; data: CreateTaskLinkDto }>({
    successMessage: '章节关联已添加',
    errorPrefix: '添加章节关联',
    mutationFn: ({ sectionId, data }) => createSectionLink(sectionId, data),
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
 * 配套 section-task-links 与 task-picker-dialog: 用带背景的 accent 配色
 * (`bg-accent-blue/10 text-accent-blue`), 否则白底卡片上仅文字色几乎不可见。
 */
export const LINK_TYPE_COLORS: Record<LinkType, string> = {
  references: 'bg-accent-blue/10 text-accent-blue',
  blocks: 'bg-accent-red/10 text-accent-red',
  relates: 'bg-accent-yellow/10 text-accent-yellow',
  implements: 'bg-accent-green/10 text-accent-green',
};
