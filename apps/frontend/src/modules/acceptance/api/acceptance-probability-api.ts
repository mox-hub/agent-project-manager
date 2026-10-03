import { api } from '@/infrastructure/api-client';

/** AI 预估达成概率单条结果（CAP-A-27 扩展批二） */
export interface CriteriaProbabilityItem {
  criteriaId: string;
  /** null = 判断通道不可用/场景禁用（前端整块隐藏） */
  probability: number | null;
  confidence: number | null;
  cached: boolean;
  model?: string;
}

export interface AcceptanceProbabilityResponse {
  items: CriteriaProbabilityItem[];
  model?: string;
}

/** criteria.metadata 投影（GET criteria 列表随实体透传） */
export interface AcceptanceProbabilityMeta {
  fingerprint: string;
  probability: number;
  confidence: number | null;
  model?: string;
  judgedAt: string;
}

export async function judgeAcceptanceProbability(
  acceptanceId: string,
  criteriaIds?: string[],
): Promise<AcceptanceProbabilityResponse> {
  return api.post<AcceptanceProbabilityResponse>(
    `/acceptance/${acceptanceId}/criteria/probability`,
    criteriaIds?.length ? { criteriaIds } : {},
  );
}

/** 从 criteria 实体（含 metadata 透传）读判定投影——日常渲染的零调用路径 */
export function readCriteriaProbability(criteria: {
  metadata?: unknown;
}): AcceptanceProbabilityMeta | null {
  const meta =
    typeof criteria.metadata === 'object' && criteria.metadata !== null
      ? (criteria.metadata as Record<string, unknown>)
      : {};
  const p = meta.acceptanceProbability as AcceptanceProbabilityMeta | undefined;
  return p && typeof p.probability === 'number' ? p : null;
}
