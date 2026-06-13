import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { terminalApi, type TerminalStatusData, type ShellTestResult } from '../api/terminal-api';

export function useTerminalStatus() {
  return useQuery<TerminalStatusData | undefined>({
    queryKey: ['terminal-status'],
    queryFn: async () => {
      const res = await terminalApi.getTerminalStatus();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTestShell() {
  const queryClient = useQueryClient();

  return useMutation<ShellTestResult, Error, string | undefined>({
    mutationFn: (shell?: string) =>
      terminalApi.testShell(shell).then((res) => res.data),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Shell 测试成功');
      } else {
        toast.error(`Shell 测试失败: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error('Shell 测试失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal-status'] });
    },
  });
}
