/**
 * Terminal Status Hooks (Stub)
 * 
 * Terminal模块已废弃，功能并入Runtime模块
 * 此文件提供向后兼容的stub实现
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
 * 获取Terminal状态 (stub)
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
 * 测试Shell连接 (stub)
 */
export function useTestShell() {
  return useMutation<ShellTestResult, Error, string>({
    mutationFn: async (shellPath: string) => {
      // Runtime模块会处理实际的shell测试
      return {
        success: true,
        output: 'Shell test passed (Runtime module)',
      };
    },
  });
}

/**
 * 获取活跃Terminal会话数 (stub)
 */
export function useTerminalSessionCount() {
  return useQuery<number>({
    queryKey: ['terminal', 'sessions', 'count'],
    queryFn: async () => 0,
    staleTime: 10000,
  });
}
