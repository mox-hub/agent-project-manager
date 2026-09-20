/**
 * Decision 模块 API client —— 统一待决决策聚合（卡片文法）。
 * 决议动作不在本 client：审批走 approval resolve、验收走 acceptance review，
 * 待闭环接线后由收件箱统一分发。
 */
import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';
import type { Decision, DecisionKind } from '@/shared/decision-card/types';

export interface DecisionListParams {
  projectId?: string;
  kind?: DecisionKind;
  limit?: number;
  offset?: number;
}

export interface DecisionListResult {
  items: Decision[];
  total: number;
  blocking: number;
  advisory: number;
}

export interface DecisionSummary {
  pending: number;
  blocking: number;
  advisory: number;
  byKind: Record<string, number>;
}

export type CreateProposalRequest = RequestBodyOf<'ProposalController_create'>;

export const decisionApi = {
  listPending: (params: DecisionListParams = {}) =>
    api.get<DecisionListResult>('/decisions/pending', params),
  summary: (projectId?: string) =>
    api.get<DecisionSummary>(
      '/decisions/summary',
      projectId ? { projectId } : undefined,
    ),
  createProposal: (data: CreateProposalRequest) =>
    api.post<{ id: string; kind: string; status: string }>(
      '/decisions/proposals',
      data,
    ),
};
