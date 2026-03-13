import { api } from '@/infrastructure/api-client';
import type { Tag, StatusDefinition, ProjectRoleDefinition, ProjectTemplate, TaskTemplate } from '../hooks/use-metadata';

// Tags API
export async function getTags(projectId?: string, resourceType?: string): Promise<Tag[]> {
  const response = await api.get<Tag[]>('/metadata/tags', {
    projectId,
    resourceType,
  });
  return response.data;
}

export async function createTag(data: Partial<Tag>): Promise<Tag> {
  const response = await api.post<Tag>('/metadata/tags', data);
  return response.data;
}

export async function updateTag(id: string, data: Partial<Tag>): Promise<Tag> {
  const response = await api.post<Tag>('/metadata/tags', { ...data, id });
  return response.data;
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/metadata/tags/${id}`);
}

// Statuses API
export async function getStatuses(projectId?: string, type?: string): Promise<StatusDefinition[]> {
  const response = await api.get<StatusDefinition[]>('/metadata/statuses', {
    projectId,
    type,
  });
  return response.data;
}

export async function createStatus(data: Partial<StatusDefinition>): Promise<StatusDefinition> {
  const response = await api.post<StatusDefinition>('/metadata/statuses', data);
  return response.data;
}

export async function updateStatus(id: string, data: Partial<StatusDefinition>): Promise<StatusDefinition> {
  const response = await api.post<StatusDefinition>('/metadata/statuses', { ...data, id });
  return response.data;
}

export async function deleteStatus(id: string): Promise<void> {
  await api.delete(`/metadata/statuses/${id}`);
}

// Project Roles API
export async function getProjectRoles(projectId?: string): Promise<ProjectRoleDefinition[]> {
  const response = await api.get<ProjectRoleDefinition[]>('/metadata/project-roles', {
    projectId,
  });
  return response.data;
}

export async function createProjectRole(data: Partial<ProjectRoleDefinition>): Promise<ProjectRoleDefinition> {
  const response = await api.post<ProjectRoleDefinition>('/metadata/project-roles', data);
  return response.data;
}

export async function updateProjectRole(id: string, data: Partial<ProjectRoleDefinition>): Promise<ProjectRoleDefinition> {
  const response = await api.post<ProjectRoleDefinition>('/metadata/project-roles', { ...data, id });
  return response.data;
}

export async function deleteProjectRole(id: string): Promise<void> {
  await api.delete(`/metadata/project-roles/${id}`);
}

// Project Templates API
export async function getProjectTemplates(q?: string): Promise<ProjectTemplate[]> {
  const response = await api.get<ProjectTemplate[]>('/metadata/templates/projects', {
    q,
  });
  return response.data;
}

export async function createProjectTemplate(data: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
  const response = await api.post<ProjectTemplate>('/metadata/templates/projects', data);
  return response.data;
}

export async function updateProjectTemplate(id: string, data: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
  const response = await api.post<ProjectTemplate>('/metadata/templates/projects', { ...data, id });
  return response.data;
}

// Task Templates API
export async function getTaskTemplates(projectId?: string): Promise<TaskTemplate[]> {
  const response = await api.get<TaskTemplate[]>('/task-templates', {
    projectId,
  });
  return response.data;
}

export async function createTaskTemplate(data: Partial<TaskTemplate>): Promise<TaskTemplate> {
  const response = await api.post<TaskTemplate>('/task-templates', data);
  return response.data;
}

export async function updateTaskTemplate(id: string, data: Partial<TaskTemplate>): Promise<TaskTemplate> {
  const response = await api.put<TaskTemplate>(`/task-templates/${id}`, data);
  return response.data;
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  await api.delete(`/task-templates/${id}`);
}
