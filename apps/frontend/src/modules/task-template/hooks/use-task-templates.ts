import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  taskTemplateApi,
  type TaskTemplate,
  type CreateTemplateRequest,
  type UseTemplateRequest,
} from '../api/task-template-api';

export function useTaskTemplates(
  projectId?: string,
  options?: Omit<UseQueryOptions<TaskTemplate[]>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['taskTemplates', projectId],
    queryFn: () => taskTemplateApi.getAll(projectId),
    ...options,
  });
}

export function useTaskTemplate(
  templateId: string | undefined,
  options?: Omit<UseQueryOptions<TaskTemplate>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: ['taskTemplate', templateId],
    enabled: !!templateId,
    queryFn: () => taskTemplateApi.getById(templateId!),
    ...options,
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => taskTemplateApi.create(data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      if (template.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['taskTemplates', template.projectId],
        });
      }
    },
  });
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { templateId: string; data: Partial<CreateTemplateRequest> }) =>
      taskTemplateApi.update(variables.templateId, variables.data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['taskTemplate', template.id] });
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => taskTemplateApi.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
    },
  });
}

export function useUseTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { templateId: string; data: UseTemplateRequest }) =>
      taskTemplateApi.useTemplate(variables.templateId, variables.data),
    onSuccess: (data) => {
      const { projectId } = data as unknown as { projectId: string };
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
    },
  });
}
