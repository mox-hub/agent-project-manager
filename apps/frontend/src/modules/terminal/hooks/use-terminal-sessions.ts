import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  terminalApi,
  type CreateTerminalSessionDto,
} from '../api/terminal-api';

export function useTerminalSessions(params?: {
  projectId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['terminal-sessions', params],
    queryFn: () => terminalApi.getSessions(params).then((res) => res.data),
  });
}

export function useTerminalSession(sessionId: string) {
  return useQuery({
    queryKey: ['terminal-session', sessionId],
    queryFn: () =>
      terminalApi.getSessionById(sessionId).then((res) => res.data),
    enabled: !!sessionId,
  });
}

export function useCreateTerminalSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateTerminalSessionDto) =>
      terminalApi.createSession(dto).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal-sessions'] });
    },
  });
}

export function useUpdateTerminalSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      name,
    }: {
      sessionId: string;
      name: string;
    }) => terminalApi.updateSession(sessionId, { name }).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-sessions'] });
      queryClient.invalidateQueries({
        queryKey: ['terminal-session', data.id],
      });
    },
  });
}

export function useCloseTerminalSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      terminalApi.closeSession(sessionId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal-sessions'] });
    },
  });
}

export function useExecuteCommand() {
  return useMutation({
    mutationFn: ({
      sessionId,
      command,
      args,
      env,
    }: {
      sessionId: string;
      command: string;
      args?: string[];
      env?: Record<string, string>;
    }) =>
      terminalApi.executeCommand(sessionId, { command, args, env }).then(
        (res) => res.data,
      ),
  });
}

export function useCommandExecutions(sessionId: string) {
  return useQuery({
    queryKey: ['command-executions', sessionId],
    queryFn: () =>
      terminalApi.getCommandExecutions(sessionId).then((res) => res.data),
    enabled: !!sessionId,
  });
}
