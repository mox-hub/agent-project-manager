import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gitApi } from '../api/git-api';
import type { GitCommandResult, GitCommandRecord } from '../api/git-api';

export function useExecuteCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      repoId,
      dto,
    }: {
      repoId: string;
      dto: {
        command: string;
        args?: string[];
        options?: { timeout?: number; allowDangerous?: boolean };
      };
    }) => gitApi.executeCommand(repoId, dto),
    onSuccess: (_data, { repoId }) => {
      queryClient.invalidateQueries({ queryKey: ['command-history', repoId] });
      queryClient.invalidateQueries({ queryKey: ['repository-status', repoId] });
    },
    onError: (err) => {
      toast.error('执行Git命令失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}

export function useCommandHistory(repoId: string, limit = 10) {
  return useQuery({
    queryKey: ['command-history', repoId, { limit }],
    queryFn: () => gitApi.getCommandHistory(repoId, limit),
    enabled: !!repoId,
    refetchInterval: 15000,
  });
}