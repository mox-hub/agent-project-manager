import { useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';

export interface Tag {
  id: string;
  projectId?: string;
  name: string;
  color?: string;
  description?: string;
  resourceTypes?: string[];
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
}

export function useTags(projectId?: string, resourceType?: string) {
  return useQuery({
    queryKey: ['metadata', 'tags', projectId, resourceType],
    queryFn: async () => {
      const response = await api.get<Tag[]>('/metadata/tags', {
        projectId,
        resourceType,
      });
      return response.data;
    },
  });
}

export function useStatuses(projectId?: string, type?: string) {
  return useQuery({
    queryKey: ['metadata', 'statuses', projectId, type],
    queryFn: async () => {
      const response = await api.get<StatusDefinition[]>('/metadata/statuses', {
        projectId,
        type,
      });
      return response.data;
    },
  });
}

export function useProjectTemplates(q?: string) {
  return useQuery({
    queryKey: ['metadata', 'templates', 'projects', q],
    queryFn: async () => {
      const response = await api.get<ProjectTemplate[]>('/metadata/templates/projects', {
        q,
      });
      return response.data;
    },
  });
}
