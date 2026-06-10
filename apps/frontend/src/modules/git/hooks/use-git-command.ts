import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gitApi } from '../api/git-api';
import type { GitCommandResult, GitCommandRecord } from '../api/git-api';

function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

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
    }) => gitApi.executeCommand(repoId, dto).then((res) => res.data),
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
    queryFn: async () => {
      const res = await gitApi.getCommandHistory(repoId, limit);
      return normalize<GitCommandRecord[]>(res.data) ?? [];
    },
    enabled: !!repoId,
    refetchInterval: 15000,
  });
}
