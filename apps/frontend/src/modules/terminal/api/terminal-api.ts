import { apiClient } from '../../../infrastructure/api-client';

export interface TerminalSession {
  id: string;
  projectId?: string;
  repoId?: string;
  name?: string;
  shell?: string;
  cwd?: string;
  createdBy: string;
  status: string;
  createdAt: string;
  closedAt?: string;
}

export interface CreateTerminalSessionDto {
  projectId?: string;
  repoId?: string;
  name?: string;
  shell?: string;
  cwd?: string;
}

export interface CommandExecution {
  id: string;
  sessionId: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  startTime: string;
  endTime?: string;
  exitCode?: number;
  status: string;
}

export interface ExecuteCommandDto {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export const terminalApi = {
  getSessions: (params?: {
    projectId?: string;
    status?: string;
  }) => {
    return apiClient.get<TerminalSession[]>('/_api/terminal/sessions', {
      params,
    });
  },

  createSession: (dto: CreateTerminalSessionDto) => {
    return apiClient.post<TerminalSession>('/_api/terminal/sessions', dto);
  },

  getSessionById: (sessionId: string) => {
    return apiClient.get<TerminalSession>(
      `/_api/terminal/sessions/${sessionId}`,
    );
  },

  updateSession: (sessionId: string, dto: { name?: string }) => {
    return apiClient.patch<TerminalSession>(
      `/_api/terminal/sessions/${sessionId}`,
      dto,
    );
  },

  closeSession: (sessionId: string) => {
    return apiClient.delete(`/_api/terminal/sessions/${sessionId}`);
  },

  executeCommand: (sessionId: string, dto: ExecuteCommandDto) => {
    return apiClient.post<CommandExecution>(
      `/_api/terminal/sessions/${sessionId}/commands`,
      dto,
    );
  },

  getCommandExecutions: (sessionId: string) => {
    return apiClient.get<CommandExecution[]>(
      `/_api/terminal/sessions/${sessionId}/commands`,
    );
  },

  getCommandExecutionById: (commandId: string) => {
    return apiClient.get<CommandExecution>(
      `/_api/terminal/commands/${commandId}`,
    );
  },
};
