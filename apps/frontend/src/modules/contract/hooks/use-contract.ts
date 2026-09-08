import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import type {
  ContractFileTypeOption,
  ContractSyncModeOption,
} from '../api/contract-api';
import { contractApi } from '../api/contract-api';

export function useContractBindings(projectId: string) {
  return useQuery({
    queryKey: ['contract', 'bindings', projectId],
    queryFn: () => contractApi.listBindings(projectId),
    enabled: !!projectId,
  });
}

export function useSeedContractFiles(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileTypes?: ContractFileTypeOption[]) =>
      contractApi.seed(projectId, { fileTypes }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contract', 'bindings', projectId],
      });
    },
    onError: (err) => {
      toast.error('契约文件种生失败: ' + (err instanceof Error ? err.message : String(err)));
    },
  });
}

export function useCheckContractAlignment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileType?: ContractFileTypeOption) =>
      contractApi.check(projectId, { fileType }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contract', 'bindings', projectId],
      });
    },
    onError: (err) => {
      toast.error('对齐检查失败: ' + (err instanceof Error ? err.message : String(err)));
    },
  });
}

export function useSetContractSyncMode(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fileType: ContractFileTypeOption; syncMode: string }) =>
      contractApi.setSyncMode(projectId, input.fileType, {
        syncMode: input.syncMode as ContractSyncModeOption,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contract', 'bindings', projectId],
      });
    },
    onError: (err) => {
      toast.error('同步模式切换失败: ' + (err instanceof Error ? err.message : String(err)));
    },
  });
}
