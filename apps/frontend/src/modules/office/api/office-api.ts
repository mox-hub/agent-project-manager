import { api } from '@/infrastructure/api-client';

/** 办公室聚合（AI 同事化 · 候选 C）——与 openapi OfficeSummary 契约对齐 */

export type OfficeStatus = 'needYou' | 'working' | 'suggestions' | 'idle';
export type OfficeAcceptability = 'available' | 'busy' | 'saturated';

export interface OfficeCapacity {
  activeRuns: number;
  capacityLimit: number;
  loadPct: number;
  weeklyTokens: number;
  weeklyCostUsd: number;
  budgetTokens?: number;
  budgetCostUsd?: number;
  budgetUsagePct?: number;
  acceptability: OfficeAcceptability;
}

export interface OfficeCurrentRun {
  id: string;
  goal: string;
  status: string;
  taskTitle?: string;
  startedAt?: string;
}

export interface OfficeColleague {
  memberId: string;
  displayName: string;
  avatarUrl?: string;
  title?: string;
  executionRole?: string;
  trustLevel?: number;
  trustScore?: number;
  status: OfficeStatus;
  blocking: number;
  advisory: number;
  capacity: OfficeCapacity;
  currentRun: OfficeCurrentRun | null;
  lastRunAt?: string;
  recentConversationAt?: string;
  currentProvider?: string;
}

export interface OfficeTotals {
  colleagues: number;
  working: number;
  needYou: number;
  blocking: number;
  advisory: number;
}

export interface OfficeSummary {
  projectId?: string;
  colleagues: OfficeColleague[];
  totals: OfficeTotals;
}

export const officeApi = {
  getSummary: (projectId?: string) =>
    api.get<OfficeSummary>('/office/summary', projectId ? { projectId } : undefined),
};
