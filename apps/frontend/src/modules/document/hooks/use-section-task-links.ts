import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSectionLinks,
  createSectionLink,
  deleteSectionLink,
  type CreateTaskLinkDto,
  type DocumentTaskLink,
} from '@/modules/document/api/document-task-link-api';
import { useToastMutation } from '@/shared/hooks';

const KEYS = {
  bySection: (sectionId: string) => ['section-task-links', sectionId] as const,
};

export function useSectionTaskLinks(sectionId: string | undefined) {
  return useQuery<DocumentTaskLink[]>({
    queryKey: KEYS.bySection(sectionId ?? ''),
    queryFn: () => fetchSectionLinks(sectionId!),
    enabled: !!sectionId,
  });
}

export function useCreateSectionTaskLink(sectionId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<DocumentTaskLink, Error, CreateTaskLinkDto>({
    successMessage: '章节任务关联已添加',
    errorPrefix: '添加章节任务关联',
    mutationFn: (input) => createSectionLink(sectionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.bySection(sectionId) });
    },
  });
}

export function useDeleteSectionTaskLink(sectionId: string) {
  const queryClient = useQueryClient();
  return useToastMutation<unknown, Error, string>({
    successMessage: '章节任务关联已删除',
    errorPrefix: '删除章节任务关联',
    mutationFn: (linkId) => deleteSectionLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.bySection(sectionId) });
    },
  });
}

export function useSectionTaskLinksByDoc(documentId: string) {
  return useQuery({
    queryKey: ['section-task-links', 'doc', documentId] as const,
    queryFn: async () => {
      const { api } = await import('@/infrastructure/api-client');
      // api.get 已解包 envelope：返回值即聚合数组本身。
      // 此前再取 `.data` 得 undefined，React Query v5 直接报
      // "Query data cannot be undefined"（正文任务 chip 计数与段落关联列表同源失效）。
      const res = await api.get<Array<{ sectionId: string; links: DocumentTaskLink[] }>>(
        `/documents/${documentId}/links/by-section`,
      );
      return res ?? [];
    },
    enabled: !!documentId,
  });
}
