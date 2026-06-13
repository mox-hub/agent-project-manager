import { apiClient } from '../../../infrastructure/api-client';

/**
 * 终端会话
 * @property id - 会话ID
 * @property projectId - 项目ID
 * @property repoId - 仓库ID
 * @property name - 会话名称
 * @property shell - 终端shell
 * @property cwd - 工作目录
 * @property createdBy - 创建者
 * @property status - 状态
 * @property createdAt - 创建时间
 * @property closedAt - 关闭时间
 */

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
/**
 * 创建终端会话请求
 * @property projectId - 项目ID
 * @property repoId - 仓库ID
 * @property name - 会话名称
 * @property shell - 终端shell
 * @property cwd - 工作目录
 */
export interface CreateTerminalSessionDto {
  projectId?: string;
  repoId?: string;
  name?: string;
  shell?: string;
  cwd?: string;
}

/**
 * 命令执行
 * @property id - 命令ID
 * @property sessionId - 会话ID
 * @property command - 命令
 * @property args - 命令参数
 * @property env - 环境变量
 * @property startTime - 开始时间
 * @property endTime - 结束时间
 * @property exitCode - 退出码
 * @property status - 状态
 */
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

/**
 * 执行命令请求
 * @property command - 命令
 * @property args - 命令参数
 * @property env - 环境变量
 */
export interface ExecuteCommandDto {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * 终端状态
 */
export interface TerminalStatusData {
  available: boolean;
  platform: string;
  defaultShell: string;
  isWindows: boolean;
  availableShells: { name: string; path: string; version?: string }[];
  activeSessions: number;
}

/**
 * Shell 测试结果
 */
export interface ShellTestResult {
  success: boolean;
  output?: string;
  error?: string;
  path?: string;
}

/**
 * 终端API
 */
export const terminalApi = {
  getSessions: (params?: {
    projectId?: string;
    status?: string;
  }) => {
    return apiClient.get<TerminalSession[]>('/terminal/sessions', {
      params,
    });
  },

  createSession: (dto: CreateTerminalSessionDto) => {
    return apiClient.post<TerminalSession>('/terminal/sessions', dto);
  },

  getSessionById: (sessionId: string) => {
    return apiClient.get<TerminalSession>(
      `/terminal/sessions/${sessionId}`,
    );
  },

  updateSession: (sessionId: string, dto: { name?: string }) => {
    return apiClient.patch<TerminalSession>(
      `/terminal/sessions/${sessionId}`,
      dto,
    );
  },

  closeSession: (sessionId: string) => {
    return apiClient.delete(`/terminal/sessions/${sessionId}`);
  },

  executeCommand: (sessionId: string, dto: ExecuteCommandDto) => {
    return apiClient.post<CommandExecution>(
      `/terminal/sessions/${sessionId}/commands`,
      dto,
    );
  },

  getCommandExecutions: (sessionId: string) => {
    return apiClient.get<CommandExecution[]>(
      `/terminal/sessions/${sessionId}/commands`,
    );
  },

  getCommandExecutionById: (commandId: string) => {
    return apiClient.get<CommandExecution>(
      `/terminal/commands/${commandId}`,
    );
  },

  getTerminalStatus: () => {
    return apiClient.get<TerminalStatusData>('/terminal/status');
  },

  testShell: (shell?: string) => {
    return apiClient.post<ShellTestResult>('/terminal/test-shell', { shell });
  },
};
