import { useQueryClient } from '@tanstack/react-query';
import { documentApi, type CreateDocumentRequest, type UpdateDocumentRequest, type Document } from '../api/document-api';
import { useToastMutation } from '@/shared/hooks';

function unwrap<T>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useToastMutation<Document, Error, CreateDocumentRequest>({
    successMessage: '文档已创建',
    errorPrefix: '创建文档',
    mutationFn: async (data: CreateDocumentRequest): Promise<Document> => {
      const res = await documentApi.create(data);
      return unwrap<Document>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useToastMutation<Document, Error, { documentId: string; data: UpdateDocumentRequest }>({
    successMessage: '文档已保存',
    errorPrefix: '保存文档',
    mutationFn: async ({ documentId, data }): Promise<Document> => {
      const res = await documentApi.update(documentId, data);
      return unwrap<Document>(res);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'detail', variables.documentId] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useToastMutation<{ success: boolean }, Error, string>({
    successMessage: '文档已删除',
    errorPrefix: '删除文档',
    mutationFn: async (documentId: string) => {
      await documentApi.delete(documentId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();

  return useToastMutation<Document, Error, string>({
    successMessage: '文档已恢复',
    errorPrefix: '恢复文档',
    mutationFn: async (documentId: string): Promise<Document> => {
      const res = await documentApi.restore(documentId);
      return unwrap<Document>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
