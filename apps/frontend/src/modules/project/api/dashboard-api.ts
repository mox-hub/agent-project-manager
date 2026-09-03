import { api } from '@/infrastructure/api-client';

// 契约：docs/design/api-contract-proposals.md §4 Dashboard（workspace 级聚合，后端可拆分）

export type DashboardRiskSeverity = 'critical' | 'high' | 'medium';
export type DashboardHealthStatus = 'on_track' | 'at_risk' | 'off_track';
export type DashboardPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface DashboardOverview {
  team: {
    totalMembers: number;
    activeTasks: number;
    avgLoadPct: number;
    members: Array<{
      id: string;
      name: string;
      role: string;
      activeTasks: number;
      completedThisWeek: number;
    }>;
  };
  ai: {
    conversations: number;
    weeklyGrowth: number;
    tokensUsed: number;
    topActivities: Array<{ activity: string; count: number }>;
  };
  cost: {
    monthTotal: number;
    budgetDeltaPct: number;
    byCategory: Array<{ name: string; amount: number; percentage: number }>;
  };
  delivery: {
    activeTasks: number;
    totalTasks: number;
    byPriority: Array<{ priority: DashboardPriority; count: number }>;
    criticalBugs: number;
    openBugs: number;
    resolvedBugs: number;
  };
  health: {
    avgScore: number;
    projects: Array<{
      id: string;
      name: string;
      score: number;
      status: DashboardHealthStatus;
    }>;
  };
  risks: {
    mitigationRatePct: number;
    items: Array<{
      id: string;
      title: string;
      severity: DashboardRiskSeverity;
      impact: string;
      mitigation: string;
    }>;
  };
  trends: {
    productivity: Array<{ date: string; tasks: number; velocity: number; quality: number }>;
    health: Array<{ week: string; score: number }>;
    performance: Array<{ metric: string; value: number }>;
  };
}

export const dashboardApi = {
  getOverview: () => api.get<DashboardOverview>('/dashboard/overview'),
};
