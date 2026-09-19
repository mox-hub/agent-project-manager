import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiHubApi } from '../api/ai-hub-api';

export const pricingSourceKeys = {
  all: ['ai-pricing-source'] as const,
};

/**
 * models.dev 价目参考源状态（CAP-A-21：只读查询，服务端不触发网络）
 */
export function usePricingSource() {
  return useQuery({
    queryKey: pricingSourceKeys.all,
    queryFn: () => aiHubApi.getPricingSourceStatus(),
    staleTime: 60_000,
  });
}

/**
 * 强制刷新 models.dev 价目目录（失败保留旧缓存并在 error 透出，不抛错）
 */
export function useRefreshPricingSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiHubApi.refreshPricingSource(),
    onSuccess: (status) => {
      queryClient.setQueryData(pricingSourceKeys.all, status);
    },
  });
}
