import { api } from '@/infrastructure/api-client';

/**
 * 需求修订影响（CAP-P-01 批一 P0 最小闭环）前端 API：
 * GET  /documents/:documentId/revision-impact          状态查询（已确认卡幂等收敛待复核标记）
 * POST /documents/:documentId/revision-impact/analyze  手动触发影响分析
 */

export interface RevisionImpactStatus {
  status: 'none' | 'pending_decision' | 'applied' | 'dismissed';
  proposalId?: string;
  issueCount?: number;
  criteriaCount?: number;
  analyzedAt?: string;
  /** 本次读取收敛时实际置为待复核的标准条数（仅 applied） */
  appliedCount?: number;
  detail?: string;
}

export interface RevisionImpactAnalyzeResult {
  status: 'created' | 'skipped' | 'not_applicable';
  proposalId?: string;
  issueCount?: number;
  criteriaCount?: number;
  reason?: string;
}

export const revisionImpactApi = {
  getStatus(documentId: string) {
    return api.get<RevisionImpactStatus>(
      `/documents/${documentId}/revision-impact`,
    );
  },
  analyze(documentId: string) {
    return api.post<RevisionImpactAnalyzeResult>(
      `/documents/${documentId}/revision-impact/analyze`,
    );
  },
};
