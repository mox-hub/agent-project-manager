import { api } from '@/infrastructure/api-client';

// 契约：docs/design/api-contract-proposals.md §2 Analytics（v1 单 overview 端点，后端可拆分）

export type AnalyticsTrendPoint = {
  date: string;
  throughput: number;
  leadTimeHours: number;
  bugCount: number;
};

export type AnalyticsModuleStatus = {
  id: string;
  name: string;
  score: number;
  trend: 'up' | 'down' | 'flat';
  owner: string;
};

export type AnalyticsRisk = {
  id: string;
  project: string;
  level: 'low' | 'medium' | 'high';
  summary: string;
  action: string;
};

export interface AnalyticsOverview {
  // Overview Tab（KPI + 趋势 + 模块健康 + 风险卡）
  totalProjects: number;
  activeAgents: number;
  deliveryRate: number;
  qualityScore: number;
  trend: AnalyticsTrendPoint[];
  moduleStatus: AnalyticsModuleStatus[];
  risks: AnalyticsRisk[];
  // Cost Tab
  costTrend: Array<{ month: string; budget: number; cost: number }>;
  costByProject: Array<{ name: string; cost: number; acceptanceCost: number }>;
  /** 图表系列色（动态内联色属宪法 §5 例外） */
  costByModel: Array<{ name: string; value: number; color: string }>;
  // Quality Tab
  qualityTrend: Array<{ week: string; patchPct: number; refactorPct: number; complexity: number }>;
  qualityByProject: Array<{ name: string; score: number; testCoverage: number }>;
  // Risk Tab
  riskItems: Array<{
    id: string;
    title: string;
    projectName: string;
    type: 'acceptance' | 'quality' | 'delivery';
    risk: number;
    trend: 'up' | 'down' | 'flat';
  }>;
  // Team Tab
  teamActivity: Array<{ week: string; tasks: number; commits: number; prs: number }>;
  memberActivity: Array<{
    name: string;
    initials: string;
    color: string;
    executions: number;
    aiHoursUsed: number;
    acceptancesOwned: number;
  }>;
  activityTimeline: Array<Record<string, string | number>>;
  radar: Array<{ subject: string; A: number }>;
}

export const analyticsApi = {
  getOverview: (params?: { from?: string; to?: string }) =>
    api.get<AnalyticsOverview>('/analytics/overview', params),
};
