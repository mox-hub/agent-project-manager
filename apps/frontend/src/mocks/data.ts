// mock 数据生成器（宪法 §9.2：≥30 条真实感记录，供密度/滚动/分页评审）
// 仅在 dev + VITE_API_MOCK=on 时随 worker 生效，生产构建不打包进启动路径。

let seq = 0;

function pick<T>(arr: readonly T[]): T {
  return arr[(seq * 7 + Math.floor(Math.random() * arr.length)) % arr.length];
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const PROJECT_STATUSES = ['planning', 'in_progress', 'on_hold', 'completed'] as const;
const HEALTH = ['on_track', 'at_risk', 'off_track'] as const;
const OWNERS = ['moxhub', 'alice', 'bob', 'carol', 'dave'] as const;

export function makeProjects(count = 42) {
  seq = 0;
  return Array.from({ length: count }, (_, i) => {
    const status = pick(PROJECT_STATUSES);
    return {
      id: `mock-project-${i + 1}`,
      name: `Mock 项目 ${i + 1}`,
      description: 'msw 生成的真实感示例项目，用于无后端评审。',
      projectCode: `MOCK-${String(i + 1).padStart(3, '0')}`,
      type: 'software',
      visibility: 'workspace',
      status,
      healthStatus: pick(HEALTH),
      priority: pick(['low', 'medium', 'high', 'urgent']),
      progress: Math.floor(Math.random() * 100),
      ownerId: 'mock-user-1',
      owner: { id: 'mock-user-1', name: 'Mock Owner', email: 'mock@example.com' },
      startDate: daysAgo(60 - (i % 30)),
      targetDate: daysAgo(-30 - (i % 60)),
      lastActivityAt: daysAgo(i % 14),
      createdAt: daysAgo(90),
      updatedAt: daysAgo(i % 7),
      _count: { tasks: 10 + (i % 40), members: 2 + (i % 8) },
    };
  });
}

const TASK_TITLES = [
  '修复列表分页边界条件',
  '设计 token 收口迁移',
  '接入 activity 时间线',
  '优化看板拖拽性能',
  '补齐空态与骨架屏',
  '重构属性面板胶囊交互',
  '统一右键菜单数据源',
  '甘特图日期缩放适配',
];

export function makeTasks(count = 60) {
  seq = 3;
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-task-${i + 1}`,
    title: `${pick(TASK_TITLES)}（#${i + 1}）`,
    status: pick(['todo', 'in_progress', 'in_review', 'done']),
    priority: pick(['low', 'medium', 'high', 'urgent']),
    projectId: `mock-project-${(i % 42) + 1}`,
    assigneeId: 'mock-user-1',
    createdAt: daysAgo(40 - (i % 30)),
    updatedAt: daysAgo(i % 10),
  }));
}

// ── Search / Delivery / Analytics（契约提案 v1，docs/design/api-contract-proposals.md）──

import type { SearchHit } from '@/modules/search/api/search-api';
import type { DeliveryNode, Annotation } from '@/modules/delivery/api/delivery-api';
import type { AnalyticsOverview } from '@/modules/analytics/api/analytics-api';

const SEARCH_SEED: Array<[SearchHit['type'], string, string, string]> = [
  ['task', 'Implement OAuth2 login', 'AgentPM Core · In Progress', '/app/tasks'],
  ['task', 'Optimize dashboard load time', 'AgentPM Core · Done', '/app/tasks'],
  ['task', 'Integrate Stripe checkout', 'Payment Module · Blocked', '/app/tasks'],
  ['task', 'Add rate limiting middleware', 'Infrastructure · Todo', '/app/tasks'],
  ['task', 'Responsive UI for mobile', 'Frontend · Failed', '/app/tasks'],
  ['task', 'Implement full-text search', 'Search Module · Done', '/app/tasks'],
  ['task', 'Real-time notifications via WS', 'Notifications · In Review', '/app/tasks'],
  ['task', 'CSV/Excel export feature', 'Reports · Todo', '/app/tasks'],
  ['task', 'Audit trail for acceptance', 'Compliance · In Progress', '/app/tasks'],
  ['bug', 'Safari localStorage token leak', 'P0 · Auth Module · Open', '/app/bugs'],
  ['bug', 'Dashboard crashes on legacy browsers', 'P2 · Frontend · Resolved', '/app/bugs'],
  ['bug', 'CSV export encoding broken', 'P1 · Reports · In Progress', '/app/bugs'],
  ['bug', 'Gantt bar misaligned at DST switch', 'P2 · Planning · Open', '/app/bugs'],
  ['document', 'OAuth2 Integration Spec', 'Specification · Published', '/app/documents'],
  ['document', 'API Rate Limiting Design', 'Design · Draft', '/app/documents'],
  ['document', 'Mobile UX Guidelines', 'Guide · Published', '/app/documents'],
  ['document', 'Q3 Sprint Retrospective', 'Retrospective · Published', '/app/documents'],
  ['document', 'Delivery Review Playbook', 'Playbook · Published', '/app/documents'],
  ['project', 'AgentPM Platform', '24 tasks · on track', '/app/projects/mock-project-1'],
  ['project', 'Payment Integration', '18 tasks · at risk', '/app/projects/mock-project-2'],
  ['project', 'AI Code Reviewer', '12 tasks · on track', '/app/projects/mock-project-3'],
  ['project', 'Data Pipeline v2', '31 tasks · on track', '/app/projects/mock-project-4'],
  ['milestone', 'Phase 1: Core Features', 'AgentPM Core · On Track', '/app/projects/mock-project-1/milestones'],
  ['milestone', 'Phase 2: Growth', 'AgentPM Core · Upcoming', '/app/projects/mock-project-1/milestones'],
  ['milestone', 'v1.0 Release', 'AgentPM Core · At Risk', '/app/projects/mock-project-1/milestones'],
  ['acceptance', 'User Auth Flow Acceptance', 'In Progress · 5/8 passed', '/app/acceptance'],
  ['acceptance', 'Dashboard Performance Acceptance', 'Passed · 6/6 criteria', '/app/acceptance'],
  ['acceptance', 'Payment 3DS Acceptance', 'Blocked · 2/9 criteria', '/app/acceptance'],
];

export function makeSearchResults(): SearchHit[] {
  seq = 11;
  return SEARCH_SEED.map(([type, title, subtitle, path], i) => ({
    id: `mock-hit-${i + 1}`,
    type,
    title,
    subtitle,
    path,
    updatedAt: daysAgo(i % 20),
  }));
}

const DELIVERY_OWNERS = ['Alex Chen', 'Sarah Kim', 'Marcus Lee', 'Lisa Wang'];
const DELIVERY_PRIOS: DeliveryNode['priority'][] = ['low', 'medium', 'high', 'critical'];

function deliveryLeaf(id: string, title: string, owner: string): DeliveryNode {
  const progress = 20 + ((seq * 13) % 80);
  return {
    id,
    level: 'feature',
    title,
    owner,
    dueDate: daysAgo(-(10 + (seq % 50))),
    progress,
    priority: pick(DELIVERY_PRIOS),
    testCoverage: 50 + ((seq * 7) % 50),
    bugCount: seq % 7,
    openPRs: seq % 3,
    riskLevel: progress > 80 ? 'low' : progress > 45 ? 'medium' : 'high',
    reqCoverage: 60 + ((seq * 11) % 40),
    businessValue: pick(['low', 'medium', 'high'] as const),
    acceptance: {
      unitTest: pick(['passed', 'in_progress', 'pending'] as const),
      internalTest: pick(['passed', 'in_progress', 'pending'] as const),
      devReview: pick(['passed', 'pending'] as const),
      pmReview: pick(['passed', 'pending'] as const),
      userReview: 'pending',
    },
    agents: {
      claudeCode: pick(['active', 'contributed', 'idle'] as const),
      cursor: pick(['active', 'idle'] as const),
      copilot: 'idle',
      codex: pick(['contributed', 'not_used'] as const),
      windsurf: 'not_used',
    },
  };
}

export function makeDeliveryTree(): { nodes: DeliveryNode[]; annotations: Annotation[] } {
  seq = 5;
  const nodes: DeliveryNode[] = [];
  for (let p = 0; p < 3; p++) {
    const project: DeliveryNode = {
      id: `dp${p + 1}`,
      level: 'project',
      title: `Mock 交付项目 ${p + 1}`,
      description: 'msw 生成的真实感交付树，用于契约联调。',
      owner: pick(DELIVERY_OWNERS),
      dueDate: daysAgo(-(60 + p * 30)),
      progress: 40 + p * 15,
      priority: p === 0 ? 'critical' : 'high',
      riskLevel: p === 0 ? 'medium' : 'low',
      acceptance: { unitTest: 'passed', internalTest: 'in_progress', devReview: 'pending', pmReview: 'pending', userReview: 'pending' },
      agents: { claudeCode: 'active', cursor: 'contributed', copilot: 'idle', codex: 'not_used', windsurf: 'not_used' },
      children: [],
    };
    for (let m = 0; m < 2; m++) {
      const milestone: DeliveryNode = {
        id: `dp${p + 1}-m${m + 1}`,
        level: 'milestone',
        title: `Phase ${m + 1} · ${p === 0 ? 'Core' : 'Extended'} ${p + 1}${m + 1}`,
        owner: pick(DELIVERY_OWNERS),
        dueDate: daysAgo(-(20 + m * 20)),
        progress: 30 + m * 25,
        priority: 'high',
        riskLevel: m === 0 ? 'low' : 'medium',
        acceptance: { unitTest: 'passed', internalTest: 'in_progress', devReview: 'pending', pmReview: 'pending', userReview: 'pending' },
        agents: { claudeCode: 'active', cursor: 'idle', copilot: 'idle', codex: 'not_used', windsurf: 'not_used' },
        children: [],
      };
      const featureCount = 3 + ((p + m) % 3);
      for (let f = 0; f < featureCount; f++) {
        milestone.children!.push(
          deliveryLeaf(`dp${p + 1}-m${m + 1}-f${f + 1}`, `Feature ${p + 1}.${m + 1}.${f + 1}`, pick(DELIVERY_OWNERS)),
        );
      }
      project.children!.push(milestone);
    }
    nodes.push(project);
  }
  const annotations: Annotation[] = [
    { id: 'ann-1', nodeId: 'dp1-m1-f1', author: 'Sarah Kim', content: '验收标准已与 PM 对齐。', timestamp: daysAgo(2), tag: 'negotiated' },
    { id: 'ann-2', nodeId: 'dp1-m1-f2', author: 'Alex Chen', content: '依赖的支付回调联调阻塞。', timestamp: daysAgo(1), tag: 'blocker' },
    { id: 'ann-3', nodeId: 'dp2-m1-f1', author: 'Marcus Lee', content: '切换到方案 B，等评审。', timestamp: daysAgo(3), tag: 'decision' },
  ];
  return { nodes, annotations };
}

export function makeAnalyticsOverview(): AnalyticsOverview {
  seq = 2;
  const weeks = Array.from({ length: 12 }, (_, i) => `W${String(i + 1).padStart(2, '0')}`);
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const projects = ['AgentPM Platform', 'Payment Integration', 'AI Code Reviewer', 'Data Pipeline v2', 'Mobile Shell', 'Plugin Runtime'];
  const models = [
    { name: 'claude-code', color: '#7c3aed' },
    { name: 'cursor', color: '#3b82f6' },
    { name: 'codex', color: '#10b981' },
    { name: 'copilot', color: '#f59e0b' },
  ];
  const memberNames = ['Alex Chen', 'Sarah Kim', 'Marcus Lee', 'Lisa Wang', 'James Wu', 'Nina Sun'];
  return {
    totalProjects: 18,
    activeAgents: 6,
    deliveryRate: 82,
    qualityScore: 89,
    trend: Array.from({ length: 30 }, (_, i) => ({
      date: daysAgo(29 - i).slice(5, 10),
      throughput: 20 + ((i * 5) % 17),
      leadTimeHours: 20 - Math.floor(i / 3),
      bugCount: 5 - (i % 4),
    })),
    moduleStatus: [
      { id: 'm-project', name: 'Project', score: 90, trend: 'up', owner: 'PMO' },
      { id: 'm-task', name: 'Task', score: 86, trend: 'up', owner: 'Delivery' },
      { id: 'm-ai', name: 'AI Hub', score: 88, trend: 'flat', owner: 'AI Team' },
      { id: 'm-git', name: 'Git', score: 84, trend: 'down', owner: 'Platform' },
      { id: 'm-terminal', name: 'Terminal', score: 92, trend: 'up', owner: 'Infra' },
    ],
    risks: [
      { id: 'r-1', project: 'Agent PM Core', level: 'high', summary: '认证任务存在 2 个阻塞项，超过 24 小时。', action: '优先清理阻塞并触发 AI 复盘' },
      { id: 'r-2', project: 'Plugin Runtime', level: 'medium', summary: '本周合并量下降，交付速率波动较大。', action: '拆分迭代范围，提升可交付颗粒度' },
      { id: 'r-3', project: 'Data Pipeline v2', level: 'low', summary: '数据迁移窗口基本敲定。', action: '保持周级别跟踪' },
    ],
    costTrend: months.map((month, i) => ({ month, budget: 300 + i * 5, cost: 180 + ((i * 23) % 120) })),
    costByProject: projects.map((name, i) => ({ name, cost: 12 + ((i * 17) % 45), acceptanceCost: 5 + ((i * 7) % 18) })),
    costByModel: models.map((m, i) => ({ ...m, value: 60 - i * 11 })),
    qualityTrend: weeks.map((week, i) => ({ week, patchPct: 55 - i * 2, refactorPct: 15 + i, complexity: 45 - i })),
    qualityByProject: projects.slice(0, 5).map((name, i) => ({ name, score: 70 + ((i * 9) % 28), testCoverage: 55 + ((i * 11) % 40) })),
    riskItems: Array.from({ length: 12 }, (_, i) => ({
      id: `mock-risk-${i + 1}`,
      title: `风险项 ${i + 1}：${['幂等性缺陷', '合规审计待启动', '精度未达标', '迁移窗口冲突'][i % 4]}`,
      projectName: projects[i % projects.length],
      type: (['acceptance', 'quality', 'delivery'] as const)[i % 3],
      risk: 40 + ((i * 9) % 55),
      trend: (['up', 'down', 'flat'] as const)[i % 3],
    })),
    teamActivity: weeks.map((week, i) => ({
      week,
      tasks: 35 + ((i * 7) % 25),
      commits: 100 + ((i * 13) % 60),
      prs: 20 + ((i * 5) % 15),
    })),
    memberActivity: memberNames.map((name, i) => ({
      name,
      initials: name.split(' ').map((w) => w[0]).join(''),
      color: ['#3b82f6', '#10b981', '#f59e0b', '#7c3aed', '#ef4444', '#0ea5e9'][i % 6],
      executions: 4 + ((i * 5) % 12),
      aiHoursUsed: 2 + ((i * 1.3) % 6),
      acceptancesOwned: 2 + ((i * 3) % 7),
    })),
    activityTimeline: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map((time, i) => ({
      time,
      alex: (i * 3) % 4,
      sarah: (i * 2 + 1) % 3,
      marcus: (i + 1) % 3,
      lisa: (i * 2) % 3,
      james: i % 2,
    })),
    radar: [
      { subject: 'Velocity', A: 85 },
      { subject: 'Quality', A: 90 },
      { subject: 'Collaboration', A: 78 },
      { subject: 'Innovation', A: 72 },
      { subject: 'Delivery', A: 88 },
      { subject: 'Learning', A: 75 },
    ],
  };
}
