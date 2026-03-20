import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, type ExternalProjectLinkRequest, type ProjectDocLinkRequest, type ProjectApiDocLinkRequest } from '../api/project-api';

export function useExternalLinks(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'external-links'],
    queryFn: () => projectApi.getExternalLinks(projectId).then(res => res.data),
    enabled: !!projectId,
  });
}

export function useAddExternalLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExternalProjectLinkRequest) =>
      projectApi.addExternalLink(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'external-links'] });
    },
  });
}

export function useUpdateExternalLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId, data }: { linkId: string; data: Partial<ExternalProjectLinkRequest> }) =>
      projectApi.updateExternalLink(projectId, linkId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'external-links'] });
    },
  });
}

export function useDeleteExternalLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => projectApi.deleteExternalLink(projectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'external-links'] });
    },
  });
}

export function useDocLinks(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'doc-links'],
    queryFn: () => projectApi.getDocLinks(projectId).then(res => res.data),
    enabled: !!projectId,
  });
}

export function useAddDocLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectDocLinkRequest) => projectApi.addDocLink(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'doc-links'] });
    },
  });
}

export function useDeleteDocLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => projectApi.deleteDocLink(projectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'doc-links'] });
    },
  });
}

export function useApiDocLinks(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'api-doc-links'],
    queryFn: () => projectApi.getApiDocLinks(projectId).then(res => res.data),
    enabled: !!projectId,
  });
}

export function useAddApiDocLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectApiDocLinkRequest) => projectApi.addApiDocLink(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'api-doc-links'] });
    },
  });
}

export function useDeleteApiDocLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => projectApi.deleteApiDocLink(projectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'api-doc-links'] });
    },
  });
}
