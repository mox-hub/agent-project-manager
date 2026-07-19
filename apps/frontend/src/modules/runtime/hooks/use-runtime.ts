/**
 * Runtime Module Hooks
 * 
 * TanStack Query hooks for runtime module
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { runtimeApi } from '../api/runtime-api';

// Query Keys
export const runtimeKeys = {
  all: ['runtime'] as const,
  list: () => [...runtimeKeys.all, 'list'] as const,
  byProject: (projectId: string) => [...runtimeKeys.all, 'project', projectId] as const,
  detail: (id: string) => [...runtimeKeys.all, 'detail', id] as const,
  sessions: (runtimeId: string) => [...runtimeKeys.all, 'sessions', runtimeId] as const,
};

// Hooks for Runtime Management
export function useRuntimes() {
  return useQuery({
    queryKey: runtimeKeys.list(),
    queryFn: () => runtimeApi.list(),
    refetchInterval: 30000, // Check every 30s
  });
}

export function useRuntime(id: string) {
  return useQuery({
    queryKey: runtimeKeys.detail(id),
    queryFn: () => runtimeApi.get(id),
    enabled: !!id,
  });
}

export function useProjectRuntimes(projectId: string) {
  return useQuery({
    queryKey: runtimeKeys.byProject(projectId),
    queryFn: () => runtimeApi.getByProject(projectId),
    enabled: !!projectId,
    refetchInterval: 30000,
  });
}

export function useRegisterRuntime() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: Parameters<typeof runtimeApi.register>[0]) =>
      runtimeApi.register(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runtimeKeys.list() });
    },
  });
}

export function useUpdateRuntimeCapabilities() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      id,
      capabilities,
    }: {
      id: string;
      capabilities: Parameters<typeof runtimeApi.updateCapabilities>[1];
    }) => runtimeApi.updateCapabilities(id, capabilities),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: runtimeKeys.detail(id) });
    },
  });
}

export function useRuntimeHeartbeat() {
  return useMutation({
    mutationFn: (id: string) => runtimeApi.heartbeat(id),
  });
}

export function useDisconnectRuntime() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => runtimeApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runtimeKeys.list() });
    },
  });
}

// Hooks for Runtime Sessions
export function useRuntimeSessions(runtimeId: string) {
  return useQuery({
    queryKey: runtimeKeys.sessions(runtimeId),
    queryFn: () => runtimeApi.listSessions(runtimeId),
    enabled: !!runtimeId,
  });
}
