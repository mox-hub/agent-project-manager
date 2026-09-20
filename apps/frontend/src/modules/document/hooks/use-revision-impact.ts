import { useQuery } from '@tanstack/react-query';
import { revisionImpactApi } from '../api/revision-impact-api';

/** 需求类文档 category（与后端 REVISION_IMPACT_CATEGORIES 同口径） */
const REVISION_IMPACT_CATEGORIES = ['requirement', 'analysis'];

/**
 * 需求修订影响状态查询（CAP-P-01）：
 * 仅需求类（requirement | analysis）文档启用；已确认卡由后端读取即收敛。
 */
export function useRevisionImpact(documentId: string, category?: string) {
  const enabled =
    Boolean(documentId) && REVISION_IMPACT_CATEGORIES.includes(category ?? '');
  return useQuery({
    queryKey: ['documents', 'revision-impact', documentId],
    enabled,
    queryFn: () => revisionImpactApi.getStatus(documentId),
    staleTime: 15_000,
  });
}
