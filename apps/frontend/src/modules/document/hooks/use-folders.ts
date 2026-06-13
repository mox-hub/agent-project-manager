import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi, folderApi, type DocumentFolder, type CreateFolderRequest, type UpdateFolderRequest } from '../api/document-api';

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

  return useMutation({
    mutationFn: (data: CreateFolderRequest) => folderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders-tree'] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, data }: { folderId: string; data: UpdateFolderRequest }) =>
      folderApi.update(folderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders-tree'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders', variables.folderId] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, force }: { folderId: string; force?: boolean }) =>
      folderApi.delete(folderId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders-tree'] });
    },
  });
}
