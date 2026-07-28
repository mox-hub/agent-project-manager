import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptanceApi } from '../api/acceptance-api';
import type { CreateCriteriaDto } from '../api/acceptance-api';

export function useAcceptance(taskId?: string) {
  return useQuery({
    queryKey: ['acceptance', 'task', taskId],
    queryFn: () => acceptanceApi.getByTask(taskId!),
    enabled: !!taskId,
  });
}

export function useAcceptanceDetail(id: string) {
  return useQuery({
    queryKey: ['acceptance', id],
    queryFn: () => acceptanceApi.get(id),
    enabled: !!id,
  });
}

export function useCreateAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof acceptanceApi.create>[0]) =>
      acceptanceApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance', 'task', data.taskId],
      });
    },
  });
}

export function useUpdateAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof acceptanceApi.update>[1];
    }) => acceptanceApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['acceptance', 'task', data.taskId],
      });
    },
  });
}

export function useDeleteAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptanceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance'],
      });
    },
  });
}

// Criteria
export function useAddCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      acceptanceId,
      data,
    }: {
      acceptanceId: string;
      data: CreateCriteriaDto;
    }) => acceptanceApi.addCriteria(acceptanceId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance', data.acceptanceId],
      });
    },
  });
}

export function useUpdateCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      criteriaId,
      data,
    }: {
      criteriaId: string;
      data: { content?: string; status?: string; severity?: string };
    }) => acceptanceApi.updateCriteria(criteriaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance'],
      });
    },
  });
}

// Audit
export function useAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      acceptanceId,
      checklistId,
    }: {
      acceptanceId: string;
      checklistId?: string;
    }) => acceptanceApi.audit(acceptanceId, checklistId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance'],
      });
    },
  });
}

export function useApplySuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      acceptanceId,
      itemIds,
    }: {
      acceptanceId: string;
      itemIds: string[];
    }) => acceptanceApi.applySuggestions(acceptanceId, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance'],
      });
    },
  });
}

// Checklists
export function useSystemChecklists() {
  return useQuery({
    queryKey: ['checklists', 'system'],
    queryFn: () => acceptanceApi.getSystemChecklists(),
  });
}

export function useAllChecklists(params?: {
  projectType?: string;
  techStack?: string;
}) {
  return useQuery({
    queryKey: ['checklists', 'all', params],
    queryFn: () => acceptanceApi.getAllChecklists(params),
  });
}

export function useApplyChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      checklistId,
      acceptanceId,
    }: {
      checklistId: string;
      acceptanceId: string;
    }) => acceptanceApi.applyChecklist(checklistId, acceptanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['acceptance'],
      });
    },
  });
}
