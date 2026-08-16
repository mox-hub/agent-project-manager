import { api } from '@/infrastructure/api-client';
import type { Tag, StatusDefinition, ProjectRoleDefinition, ProjectTemplate, TaskTemplate } from '../hooks/use-metadata';

// Tags API
export async function getTags(projectId?: string, resourceType?: string): Promise<Tag[]> {
  return api.get<Tag[]>('/metadata/tags', {
    projectId,
    resourceType,
  });
}

export async function createTag(data: Partial<Tag>): Promise<Tag> {
  return api.post<Tag>('/metadata/tags', data);
}

export async function updateTag(id: string, data: Partial<Tag>): Promise<Tag> {
  return api.post<Tag>('/metadata/tags', { ...data, id });
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/metadata/tags/${id}`);
}

// Statuses API
export async function getStatuses(projectId?: string, type?: string): Promise<StatusDefinition[]> {
  return api.get<StatusDefinition[]>('/metadata/statuses', {
    projectId,
    type,
  });
}

export async function createStatus(data: Partial<StatusDefinition>): Promise<StatusDefinition> {
  return api.post<StatusDefinition>('/metadata/statuses', data);
}

export async function updateStatus(id: string, data: Partial<StatusDefinition>): Promise<StatusDefinition> {
  return api.post<StatusDefinition>('/metadata/statuses', { ...data, id });
}

export async function deleteStatus(id: string): Promise<void> {
  await api.delete(`/metadata/statuses/${id}`);
}

// Project Roles API
export async function getProjectRoles(projectId?: string): Promise<ProjectRoleDefinition[]> {
  return api.get<ProjectRoleDefinition[]>('/metadata/project-roles', {
    projectId,
  });
}

export async function createProjectRole(data: Partial<ProjectRoleDefinition>): Promise<ProjectRoleDefinition> {
  return api.post<ProjectRoleDefinition>('/metadata/project-roles', data);
}

export async function updateProjectRole(id: string, data: Partial<ProjectRoleDefinition>): Promise<ProjectRoleDefinition> {
  return api.post<ProjectRoleDefinition>('/metadata/project-roles', { ...data, id });
}

export async function deleteProjectRole(id: string): Promise<void> {
  await api.delete(`/metadata/project-roles/${id}`);
}

// Project Templates API
export async function getProjectTemplates(q?: string): Promise<ProjectTemplate[]> {
  return api.get<ProjectTemplate[]>('/metadata/templates/projects', {
    q,
  });
}

export async function createProjectTemplate(data: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
  return api.post<ProjectTemplate>('/metadata/templates/projects', data);
}

export async function updateProjectTemplate(id: string, data: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
  return api.post<ProjectTemplate>('/metadata/templates/projects', { ...data, id });
}

// Task Templates API
export async function getTaskTemplates(projectId?: string): Promise<TaskTemplate[]> {
  return api.get<TaskTemplate[]>('/task-templates', {
    projectId,
  });
}

export async function createTaskTemplate(data: Partial<TaskTemplate>): Promise<TaskTemplate> {
  return api.post<TaskTemplate>('/task-templates', data);
}

export async function updateTaskTemplate(id: string, data: Partial<TaskTemplate>): Promise<TaskTemplate> {
  return api.put<TaskTemplate>(`/task-templates/${id}`, data);
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  await api.delete(`/task-templates/${id}`);
}
