import { useQuery } from '@tanstack/react-query';
import { deliveryApi } from '../api/delivery-api';

/** 交付总览（提案契约 v1）。 */
export function useDeliveryOverview(projectId?: string) {
  return useQuery({
    queryKey: ['deliveryOverview', projectId],
    queryFn: () => deliveryApi.getOverview(projectId),
    staleTime: 60_000,
  });
}
