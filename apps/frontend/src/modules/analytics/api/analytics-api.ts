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

export type AnalyticsOverview = {
  totalProjects: number;
  activeAgents: number;
  deliveryRate: number;
  qualityScore: number;
  trend: AnalyticsTrendPoint[];
  moduleStatus: AnalyticsModuleStatus[];
  risks: AnalyticsRisk[];
};

const OVERVIEW: AnalyticsOverview = {
  totalProjects: 18,
  activeAgents: 6,
  deliveryRate: 82,
  qualityScore: 89,
  trend: [
    { date: '03-18', throughput: 24, leadTimeHours: 18, bugCount: 5 },
    { date: '03-19', throughput: 27, leadTimeHours: 17, bugCount: 4 },
    { date: '03-20', throughput: 30, leadTimeHours: 15, bugCount: 3 },
    { date: '03-21', throughput: 29, leadTimeHours: 14, bugCount: 3 },
    { date: '03-22', throughput: 31, leadTimeHours: 13, bugCount: 2 },
    { date: '03-23', throughput: 33, leadTimeHours: 12, bugCount: 2 },
    { date: '03-24', throughput: 35, leadTimeHours: 11, bugCount: 1 },
  ],
  moduleStatus: [
    { id: 'm-project', name: 'Project', score: 90, trend: 'up', owner: 'PMO' },
    { id: 'm-task', name: 'Task', score: 86, trend: 'up', owner: 'Delivery' },
    { id: 'm-ai', name: 'AI Hub', score: 88, trend: 'flat', owner: 'AI Team' },
    { id: 'm-git', name: 'Git', score: 84, trend: 'down', owner: 'Platform' },
    { id: 'm-terminal', name: 'Terminal', score: 92, trend: 'up', owner: 'Infra' },
  ],
  risks: [
    {
      id: 'r-1',
      project: 'Agent PM Core',
      level: 'high',
      summary: '认证任务存在 2 个阻塞项，超过 24 小时。',
      action: '优先清理阻塞并触发 AI 复盘',
    },
    {
      id: 'r-2',
      project: 'Plugin Runtime',
      level: 'medium',
      summary: '本周合并量下降，交付速率波动较大。',
      action: '拆分迭代范围，提升可交付颗粒度',
    },
  ],
};

export const analyticsApi = {
  getOverview: async (): Promise<AnalyticsOverview> => OVERVIEW,
};
