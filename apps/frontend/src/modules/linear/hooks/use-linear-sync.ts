import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  IntegrationKeys,
  linearApi,
  type SyncDirection,
  type SyncSummary,
  type TestConnectionResponse,
  type LinearRemoteProject,
  type SyncLog,
} from '../api/linear-api';

export function useLinearViewer(integrationId: string | null | undefined) {
  return useQuery<TestConnectionResponse>({
    queryKey: IntegrationKeys.linearViewer(integrationId ?? ''),
    queryFn: () => linearApi.testConnection(integrationId!),
    enabled: !!integrationId,
    staleTime: 5 * 60_000,
  });
}

export function useLinearRemoteProjects(integrationId: string | null | undefined) {
  return useQuery<LinearRemoteProject[]>({
    queryKey: IntegrationKeys.linearRemoteProjects(integrationId ?? ''),
    queryFn: () => linearApi.listRemoteProjects(integrationId!),
    enabled: !!integrationId,
    staleTime: 60_000,
  });
}

export function useSyncProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      integrationId: string;
      linearProjectId: string;
      targetLocalProjectId?: string;
    }) => linearApi.syncProject(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', result.projectId] });
      qc.invalidateQueries({ queryKey: ['tasks', { projectId: result.projectId }] });
      toast.success(
        result.created
          ? 'Project created from Linear'
          : 'Project updated from Linear',
      );
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : 'Failed to sync project from Linear',
      ),
  });
}

export function useSyncTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      direction: SyncDirection;
      taskIds?: string[];
      confirm?: boolean;
    }) => linearApi.syncTasks(data),
    onSuccess: (summary: SyncSummary, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks', { projectId: variables.projectId }] });
      qc.invalidateQueries({ queryKey: ['project', variables.projectId] });
      qc.invalidateQueries({ queryKey: IntegrationKeys.syncLogs('') });
      toast.success(
        `Sync done — added ${summary.added}, updated ${summary.updated}, conflicts ${summary.conflicts}, errors ${summary.errors}`,
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to sync tasks'),
  });
}

export function usePushCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; localTaskId: string }) =>
      linearApi.pushCreateIssue(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks', { projectId: variables.projectId }] });
      toast.success('Issue created on Linear');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to create issue'),
  });
}

export function useResolveConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      taskId: string;
      resolution: 'use_linear' | 'use_local' | 'keep_both';
    }) => linearApi.resolveConflict(data),
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: ['task', variables.taskId] });
      toast.success(
        result.resolution === 'use_linear'
          ? 'Conflict resolved: Linear version applied'
          : result.resolution === 'use_local'
            ? 'Conflict resolved: Local version pushed to Linear'
            : 'Conflict resolved: kept both versions',
      );
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : 'Failed to resolve conflict',
      ),
  });
}

export function useSyncLogs(integrationId: string | null | undefined) {
  return useQuery<SyncLog[]>({
    queryKey: IntegrationKeys.syncLogs(integrationId ?? ''),
    queryFn: () => linearApi.listLogs(integrationId!),
    enabled: !!integrationId,
    refetchInterval: 30_000,
  });
}
