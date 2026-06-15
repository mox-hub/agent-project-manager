import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  documentApi,
  folderApi,
  type DocumentFolder,
  type CreateFolderRequest,
  type UpdateFolderRequest,
} from '../api/document-api';
import { useToastMutation } from '@/shared/hooks';

export function useFolders(projectId?: string) {
  return useQuery({
    queryKey: ['document-folders', projectId],
    queryFn: () => folderApi.getList(projectId).then((res) => res.data),
  });
}

export function useFolderTree(projectId?: string) {
  return useQuery({
    queryKey: ['document-folders-tree', projectId],
    queryFn: () => folderApi.getTree(projectId).then((res) => res.data),
  });
}

export function useFolder(folderId: string) {
  return useQuery({
    queryKey: ['document-folders', folderId],
    enabled: Boolean(folderId),
    queryFn: () => folderApi.getById(folderId).then((res) => res.data),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useToastMutation<unknown, Error, CreateFolderRequest>({
    successMessage: '文件夹已创建',
    errorPrefix: '创建文件夹',
    mutationFn: (data) => folderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders-tree'] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useToastMutation<unknown, Error, { folderId: string; data: UpdateFolderRequest }>({
    successMessage: '文件夹已更新',
    errorPrefix: '更新文件夹',
    mutationFn: ({ folderId, data }) => folderApi.update(folderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders-tree'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders', variables.folderId] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useToastMutation<unknown, Error, { folderId: string }>({
    successMessage: '文件夹已删除',
    errorPrefix: '删除文件夹',
    mutationFn: ({ folderId }) => folderApi.delete(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders-tree'] });
    },
  });
}
