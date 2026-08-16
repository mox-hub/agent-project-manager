import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  documentTagApi,
  type CreateTagRequest,
  type UpdateTagRequest,
  type DocumentTag,
} from '@/modules/document/api/document-tag-api';
import { useToastMutation } from '@/shared/hooks';

const KEYS = {
  all: ['document-tags', 'all'] as const,
  byDoc: (documentId: string) => ['document-tags', 'doc', documentId] as const,
};

export function useAllTags(projectId?: string) {
  return useQuery<DocumentTag[]>({
    queryKey: [...KEYS.all, projectId ?? 'global'],
    queryFn: () => documentTagApi.listAll(projectId),
    staleTime: 30_000,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useToastMutation<DocumentTag, Error, CreateTagRequest>({
    successMessage: '标签已创建',
    errorPrefix: '创建标签',
    mutationFn: (input) => documentTagApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useToastMutation<DocumentTag, Error, { id: string; data: UpdateTagRequest }>({
    successMessage: '标签已更新',
    errorPrefix: '更新标签',
    mutationFn: ({ id, data }) => documentTagApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useToastMutation<unknown, Error, string>({
    successMessage: '标签已删除',
    errorPrefix: '删除标签',
    mutationFn: (id) => documentTagApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDocumentTags(documentId: string) {
  return useQuery<DocumentTag[]>({
    queryKey: KEYS.byDoc(documentId),
    queryFn: () => documentTagApi.listForDocument(documentId),
    enabled: !!documentId,
  });
}

export function useAttachTag() {
  const queryClient = useQueryClient();
  return useToastMutation<unknown, Error, { documentId: string; tagId: string }>({
    successMessage: '标签已附加',
    errorPrefix: '附加标签',
    mutationFn: ({ documentId, tagId }) => documentTagApi.attachToDocument(documentId, tagId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: KEYS.byDoc(vars.documentId) });
    },
  });
}

export function useDetachTag() {
  const queryClient = useQueryClient();
  return useToastMutation<unknown, Error, { documentId: string; tagId: string }>({
    successMessage: '标签已分离',
    errorPrefix: '分离标签',
    mutationFn: ({ documentId, tagId }) => documentTagApi.detachFromDocument(documentId, tagId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: KEYS.byDoc(vars.documentId) });
    },
  });
}
