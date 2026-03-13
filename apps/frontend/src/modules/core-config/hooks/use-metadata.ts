import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';

export interface Tag {
  id: string;
  projectId?: string;
  name: string;
  color?: string;
  description?: string;
  resourceTypes?: string[];
  createdAt?: string;
  updatedAt?: string;
  isArchived?: boolean;
  order?: number;
}

export interface StatusDefinition {
  id: string;
  projectId?: string;
  type: string;
  key: string;
  name: string;
  order: number;
  isFinal: boolean;
  isBlockedState: boolean;
  allowedNextStatusKeys?: string[];
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectRoleDefinition {
  id: string;
  projectId?: string;
  key: string;
  name: string;
  description?: string;
  defaultAssigneeIds?: string[];
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  baseProjectType?: string;
  defaultTags?: unknown;
  defaultStatuses?: unknown;
  defaultIterations?: unknown;
  defaultTasks?: unknown;
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskTemplate {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  category?: string;
  items?: TaskTemplateItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskTemplateItem {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate?: number;
  parentItemId?: string;
}

export function useTags(projectId?: string, resourceType?: string) {
  return useQuery({
    queryKey: ['metadata', 'tags', projectId, resourceType],
    queryFn: async () => {
      const response = await api.get<{ data: Tag[] } | Tag[]>('/metadata/tags', {
        projectId,
        resourceType,
      });
      // Handle both wrapped { data: [...] } and raw [...] formats
      const rawData = response.data;
      if (Array.isArray(rawData)) {
        return rawData;
      }
      if (rawData && typeof rawData === 'object' && 'data' in rawData) {
        return (rawData as { data: Tag[] }).data;
      }
      return [];
    },
  });
}

export function useStatuses(projectId?: string, type?: string) {
  return useQuery({
    queryKey: ['metadata', 'statuses', projectId, type],
    queryFn: async () => {
      const response = await api.get<{ data: StatusDefinition[] } | StatusDefinition[]>('/metadata/statuses', {
        projectId,
        type,
      });
      const rawData = response.data;
      if (Array.isArray(rawData)) {
        return rawData;
      }
      if (rawData && typeof rawData === 'object' && 'data' in rawData) {
        return (rawData as { data: StatusDefinition[] }).data;
      }
      return [];
    },
  });
}

export function useProjectTemplates(q?: string) {
  return useQuery({
    queryKey: ['metadata', 'templates', 'projects', q],
    queryFn: async () => {
      const response = await api.get<{ data: ProjectTemplate[] } | ProjectTemplate[]>('/metadata/templates/projects', {
        q,
      });
      const rawData = response.data;
      if (Array.isArray(rawData)) {
        return rawData;
      }
      if (rawData && typeof rawData === 'object' && 'data' in rawData) {
        return (rawData as { data: ProjectTemplate[] }).data;
      }
      return [];
    },
  });
}

// Tags Hooks
export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Tag>) => api.post<Tag>('/metadata/tags', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'tags'] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tag> }) => api.post<Tag>('/metadata/tags', { ...data, id }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/metadata/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'tags'] });
    },
  });
}

// Statuses Hooks
export function useCreateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StatusDefinition>) => api.post<StatusDefinition>('/metadata/statuses', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'statuses'] });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StatusDefinition> }) => api.post<StatusDefinition>('/metadata/statuses', { ...data, id }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'statuses'] });
    },
  });
}

export function useDeleteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/metadata/statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'statuses'] });
    },
  });
}

// Project Roles Hooks
export function useProjectRoles(projectId?: string) {
  return useQuery({
    queryKey: ['metadata', 'project-roles', projectId],
    queryFn: async () => {
      const response = await api.get<{ data: ProjectRoleDefinition[] } | ProjectRoleDefinition[]>('/metadata/project-roles', {
        projectId,
      });
      const rawData = response.data;
      if (Array.isArray(rawData)) {
        return rawData;
      }
      if (rawData && typeof rawData === 'object' && 'data' in rawData) {
        return (rawData as { data: ProjectRoleDefinition[] }).data;
      }
      return [];
    },
  });
}

export function useCreateProjectRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProjectRoleDefinition>) => api.post<ProjectRoleDefinition>('/metadata/project-roles', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'project-roles'] });
    },
  });
}

export function useUpdateProjectRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectRoleDefinition> }) => api.post<ProjectRoleDefinition>('/metadata/project-roles', { ...data, id }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'project-roles'] });
    },
  });
}

export function useDeleteProjectRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/metadata/project-roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'project-roles'] });
    },
  });
}

// Project Templates Hooks
export function useCreateProjectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProjectTemplate>) => api.post<ProjectTemplate>('/metadata/templates/projects', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'templates', 'projects'] });
    },
  });
}

export function useUpdateProjectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectTemplate> }) => api.post<ProjectTemplate>('/metadata/templates/projects', { ...data, id }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata', 'templates', 'projects'] });
    },
  });
}

// Task Templates Hooks
export function useTaskTemplates(projectId?: string) {
  return useQuery({
    queryKey: ['task-templates', projectId],
    queryFn: async () => {
      const response = await api.get<{ data: TaskTemplate[] } | TaskTemplate[]>('/task-templates', {
        projectId,
      });
      const rawData = response.data;
      if (Array.isArray(rawData)) {
        return rawData;
      }
      if (rawData && typeof rawData === 'object' && 'data' in rawData) {
        return (rawData as { data: TaskTemplate[] }).data;
      }
      return [];
    },
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskTemplate>) => api.post<TaskTemplate>('/task-templates', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    },
  });
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskTemplate> }) => api.put<TaskTemplate>(`/task-templates/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/task-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    },
  });
}
