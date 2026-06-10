import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gitApi } from '../api/git-api';
import type { GitToolStatusData } from '../api/git-api';

function normalize<T>(data: unknown): T | undefined {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T | undefined;
}

export function useGitToolStatus() {
  return useQuery<GitToolStatusData | undefined>({
    queryKey: ['git-tool-status'],
    queryFn: async () => {
      const res = await gitApi.checkGitTool();
      return normalize<GitToolStatusData>(res.data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetGitPath() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gitPath: string) =>
      gitApi.setGitPath(gitPath).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-tool-status'] });
    },
    onError: (err) => {
      toast.error('设置Git路径失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}
