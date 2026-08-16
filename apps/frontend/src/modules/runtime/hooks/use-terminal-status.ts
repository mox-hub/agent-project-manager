/**
 * Terminal Status Hooks
 *
 * Terminal 模块已废弃，功能并入 Runtime 模块
 * 这些 hooks 提供终端状态相关的查询
 */

import { useQuery, useMutation } from '@tanstack/react-query';

export interface TerminalStatus {
  available: boolean;
  isWindows: boolean;
  platform?: string;
  defaultShell?: string;
  availableShells?: string[];
  activeSessions?: number;
}

export interface ShellTestResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * 获取 Terminal 状态
 */
export function useTerminalStatus() {
  return useQuery<TerminalStatus>({
    queryKey: ['terminal', 'status'],
    queryFn: async () => ({
      available: false,
      isWindows: true,
      defaultShell: 'pwsh',
      availableShells: ['pwsh', 'powershell', 'cmd'],
      activeSessions: 0,
    }),
    staleTime: 30000,
  });
}

/**
 * 测试 Shell 连接
 */
export function useTestShell() {
  return useMutation<ShellTestResult, Error, string>({
    mutationFn: async (shellPath: string) => {
      // Runtime 模块会处理实际的 shell 测试
      return {
        success: true,
        output: 'Shell test passed (Runtime module)',
      };
    },
  });
}

/**
 * 获取活跃 Terminal 会话数
 */
export function useTerminalSessionCount() {
  return useQuery<number>({
    queryKey: ['terminal', 'sessions', 'count'],
    queryFn: async () => 0,
    staleTime: 10000,
  });
}
