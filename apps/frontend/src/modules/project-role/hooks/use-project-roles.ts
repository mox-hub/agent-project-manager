import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/project-roles-api';
import type {
  CreateProjectRoleInput,
  UpdateProjectRoleInput,
} from '../api/project-roles-api';

export function useProjectRoles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-roles', projectId],
    queryFn: () => api.list(projectId!),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useProjectRoleTemplates(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-role-templates', projectId],
    queryFn: () => api.listTemplates(projectId!),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useCreateProjectRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRoleInput) => api.create(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-roles', projectId] });
    },
  });
}

export function useUpdateProjectRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProjectRoleInput;
    }) => api.update(projectId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-roles', projectId] });
    },
  });
}

export function useRemoveProjectRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.remove(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-roles', projectId] });
    },
  });
}

export function useSeedProjectRoles(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.seedFromGlobal(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-roles', projectId] });
    },
  });
}
