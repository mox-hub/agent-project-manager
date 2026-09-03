import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { gitApi } from '../api/git-api';
import type { GitToolStatusData } from '../api/git-api';

export function useGitToolStatus() {
  return useQuery<GitToolStatusData | undefined>({
    queryKey: ['git-tool-status'],
    queryFn: () => gitApi.checkGitTool(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetGitPath() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gitPath: string) => gitApi.setGitPath(gitPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-tool-status'] });
    },
    onError: (err) => {
      toast.error('设置Git路径失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}