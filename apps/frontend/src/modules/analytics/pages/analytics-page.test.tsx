import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/providers';
import { AnalyticsPage, getAvailableAnalyticsTabs } from './analytics-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // 兼容两种第二参：字符串 fallback 直出；对象（插值选项）时回键名
    t: (key: string, fallbackOrOpts?: string | Record<string, unknown>) =>
      typeof fallbackOrOpts === 'string' ? fallbackOrOpts : key,
    i18n: { language: 'zh-CN' },
  }),
  // '@/hooks/useTranslation' → '@/i18n' 初始化链需要 initReactI18next 插件对象
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// mock 模式开关（P0-13：质量/团队 Tab 仅 msw 演示模式可见）——可变注入，默认关闭
const mocksState = vi.hoisted(() => ({ mockEnabled: false }));
vi.mock('@/mocks', () => ({ isMockModeEnabled: () => mocksState.mockEnabled }));

// Overview 数据源 = GET /dashboard/overview（真实端点）；测试注入固定七段数据
vi.mock('@/modules/project/hooks/use-dashboard-overview', () => ({
  useDashboardOverview: () => ({
    data: {
      team: { totalMembers: 3, activeTasks: 5, avgLoadPct: 60, members: [] },
      ai: { conversations: 12, weeklyGrowth: 5, tokensUsed: 12345, topActivities: [] },
      cost: { monthTotal: 10, budgetDeltaPct: 2, byCategory: [] },
      delivery: { activeTasks: 5, totalTasks: 20, byPriority: [], criticalBugs: 0, openBugs: 1, resolvedBugs: 9 },
      health: {
        avgScore: 82,
        projects: [{ id: 'p1', name: '示例项目', score: 82, status: 'on_track' }],
      },
      risks: {
        mitigationRatePct: 40,
        items: [{ id: 'r1', title: '示例风险', severity: 'high', impact: '影响', mitigation: '建议' }],
      },
      trends: { productivity: [], health: [], performance: [] },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// 回顾性卡片数据（档案健康/剧本健康）固定为空，断言只看卡片标题
vi.mock('../hooks/use-analytics-overview', () => ({
  useAnalyticsOverview: () => ({ data: undefined, isLoading: false }),
  useProfileHealth: () => ({ data: { items: [] }, isLoading: false }),
  usePlaybookHealth: () => ({ data: { stages: [], mountedProjects: 0 }, isLoading: false }),
}));

// 成本 Tab 数据源（GET /ai/usage，CAP-C-06 迁移做实）：可变注入（正常流=固定数据，空态流置空）
const usageMock = vi.hoisted(() => ({
  data: {
    totalTokens: 123456,
    totalCost: 1.23,
    byModel: [
      { modelName: 'gpt-test', totalTokens: 100000, totalCost: 1.0 },
      { modelName: 'claude-test', totalTokens: 23456, totalCost: 0.23 },
    ],
    byDay: [
      { day: '2026-09-18', totalTokens: 100000, totalCost: 1.0 },
      { day: '2026-09-19', totalTokens: 23456, totalCost: 0.23 },
    ],
  } as
    | {
        totalTokens: number;
        totalCost: number;
        byModel: Array<{ modelName: string; totalTokens: number; totalCost: number }>;
        byDay: Array<{ day: string; totalTokens: number; totalCost: number }>;
      }
    | undefined,
}));
vi.mock('../hooks/use-ai-usage', () => ({
  useAiUsage: () => ({ data: usageMock.data, isLoading: false }),
  AI_USAGE_RANGE_OPTIONS: [
    { id: '7d', days: 7 },
    { id: '30d', days: 30 },
    { id: 'all' },
  ],
}));

// 验收归因数据源（GET /ai/usage/acceptance-attribution，CAP-C-06）：可变注入
const attributionMock = vi.hoisted(() => ({
  data: {
    totalExecutionCost: 3.75,
    reworkCost: 2,
    reworkPct: 53.33,
    acceptanceCount: 2,
    avgCostPerAcceptance: 1.875,
    byAcceptance: [
      {
        acceptanceId: 'acc-1',
        acceptanceTitle: '验收单一',
        issueId: 'issue-1',
        issueTitle: '工单一',
        issueTypeName: '需求拆解',
        cost: 3.5,
        executionCount: 3,
        reworkCount: 2,
      },
      {
        acceptanceId: 'acc-2',
        acceptanceTitle: null,
        issueId: 'issue-2',
        issueTitle: '工单二',
        issueTypeName: '缺陷修复',
        cost: 0.25,
        executionCount: 1,
        reworkCount: 0,
      },
    ],
    byIssueType: [
      { issueTypeName: '需求拆解', reworkCount: 2, cost: 3.5 },
      { issueTypeName: '缺陷修复', reworkCount: 0, cost: 0.25 },
    ],
  } as
    | {
        totalExecutionCost: number;
        reworkCost: number;
        reworkPct: number;
        acceptanceCount: number;
        avgCostPerAcceptance: number | null;
        byAcceptance: Array<{
          acceptanceId: string;
          acceptanceTitle?: string | null;
          issueId: string;
          issueTitle: string;
          issueTypeName: string;
          cost: number;
          executionCount: number;
          reworkCount: number;
        }>;
        byIssueType: Array<{ issueTypeName: string; reworkCount: number; cost: number }>;
      }
    | undefined,
}));
vi.mock('../hooks/use-acceptance-attribution', () => ({
  useAcceptanceAttribution: () => ({
    data: attributionMock.data,
    isLoading: false,
  }),
}));

function renderPage(initialEntry = '/app/analytics') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AnalyticsPage 可用 Tab 计算（P0-13：mock 形态 Tab 按 msw 演示模式收敛）', () => {
  it('生产模式保留 overview + cost（cost 迁入真实数据升正式 Tab），mock/dev Tab 均不出现', () => {
    const prod = getAvailableAnalyticsTabs(false, false);
    expect(prod.map((d) => d.value)).toEqual(['overview', 'cost']);
  });

  it('DEV 未开 msw：risk 仍在（真实模式全 0 空态），quality/team 不再露出（P0-13 回归）', () => {
    const dev = getAvailableAnalyticsTabs(true, false);
    expect(dev.map((d) => d.value)).toEqual(['overview', 'cost', 'risk']);
  });

  it('msw 演示模式（DEV + VITE_API_MOCK=on）：五个 Tab 全量可见', () => {
    const mock = getAvailableAnalyticsTabs(true, true);
    expect(mock.map((d) => d.value)).toEqual(['overview', 'cost', 'quality', 'risk', 'team']);
  });
});

describe('AnalyticsPage', () => {
  it('Overview 去重：不再渲染与 Dashboard 同源的指标/表格/风险卡，保留回顾性内容', async () => {
    renderPage();

    // analytics 独有的回顾性内容仍在
    expect(await screen.findByText('项目档案健康')).toBeTruthy();
    expect(screen.getByText(/项目步骤健康/)).toBeTruthy();
    expect(screen.getByText('项目总数')).toBeTruthy();
    // 与 Dashboard 同源的五项内容移除（真相源 = /app/projects/dashboard）
    expect(screen.queryByText('活跃任务')).toBeNull();
    expect(screen.queryByText('平均健康分')).toBeNull();
    expect(screen.queryByText('AI 周用量')).toBeNull();
    expect(screen.queryByText('项目健康')).toBeNull();
    expect(screen.queryByText('风险聚焦')).toBeNull();
    expect(screen.queryByText('示例项目')).toBeNull();
  });

  it('标题走 i18n（analytics.title）；DEV 未开 msw 时 quality/team 收敛、risk 保留', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: '分析' })).toBeTruthy();
    expect(screen.getAllByText('成本').length).toBeGreaterThan(0);
    // risk 仍为 DEV 可见（真实模式全 0 空态）
    expect(screen.getAllByText('风险').length).toBeGreaterThan(0);
    // P0-13：mock 形态 Tab（质量/团队）在非演示模式不渲染，硬编码假数据不露出
    expect(screen.queryByText('质量')).toBeNull();
    expect(screen.queryByText('团队')).toBeNull();
  });
});

describe('AnalyticsPage msw 演示模式（quality/team 可见 + 演示数据徽章）', () => {
  afterEach(() => {
    mocksState.mockEnabled = false;
  });

  it('演示模式下质量 Tab 渲染并带「演示数据」徽章，文案已中文化', async () => {
    mocksState.mockEnabled = true;
    renderPage('/app/analytics?tab=quality');

    // 徽章 + 质量 Tab 中文化后的标题（t fallback 直出中文）
    expect(await screen.findByText('演示数据 · 后端未接入，非真实统计')).toBeTruthy();
    expect(screen.getByText('平均质量分')).toBeTruthy();
    expect(screen.getByText('代码变更质量趋势')).toBeTruthy();
    expect(screen.getByText('各项目质量分')).toBeTruthy();
  });

  it('演示模式下 ?tab=team 定位生效，团队 Tab 渲染中文化内容', async () => {
    mocksState.mockEnabled = true;
    renderPage('/app/analytics?tab=team');

    expect(await screen.findByText('演示数据 · 后端未接入，非真实统计')).toBeTruthy();
    expect(screen.getByText('活跃成员')).toBeTruthy();
    expect(screen.getByText('成员 AI 用量拆解')).toBeTruthy();
  });

  it('非演示模式下 ?tab=team URL 不生效：回退 overview，质量/团队不渲染', async () => {
    renderPage('/app/analytics?tab=team');

    // 回退到 overview（回顾性内容可见）
    expect(await screen.findByText('项目档案健康')).toBeTruthy();
    expect(screen.queryByText('演示数据 · 后端未接入，非真实统计')).toBeNull();
    expect(screen.queryByText('团队')).toBeNull();
  });
});

describe('AnalyticsPage 成本 Tab（AI 用量迁移做实，?tab=cost 定位）', () => {
  it('正常流：渲染汇总卡/按日成本柱状图/AI 活跃热力图/按模型表', async () => {
    renderPage('/app/analytics?tab=cost');

    // ?tab=cost 定位生效 + 汇总卡（i18n mock 返回键名）：token/成本 + 调用来源四计数
    expect(await screen.findByText('analytics.cost.totalTokens')).toBeTruthy();
    expect(screen.getByText('analytics.cost.totalCost')).toBeTruthy();
    expect(screen.getByText('analytics.cost.totalCalls')).toBeTruthy();
    expect(screen.getByText('analytics.cost.conversationCalls')).toBeTruthy();
    expect(screen.getByText('analytics.cost.silentCalls')).toBeTruthy();
    expect(screen.getByText('analytics.cost.executionCalls')).toBeTruthy();
    // 柱状图卡 + 热力图卡 + 按模型表
    expect(screen.getByText('analytics.cost.dailyCost')).toBeTruthy();
    expect(screen.getByText('analytics.cost.heatmap')).toBeTruthy();
    expect(screen.getByText('analytics.cost.byModel')).toBeTruthy();
    // 模型行与 Token 数值（按 totalTokens 降序）
    expect(screen.getByText('gpt-test')).toBeTruthy();
    expect(screen.getByText('claude-test')).toBeTruthy();
    expect(screen.getByText('100,000')).toBeTruthy();
    // 旧设置页独有内容已并入：不再出现空态
    expect(screen.queryByText('analytics.cost.emptyTitle')).toBeNull();
  });

  it('验收归因区：汇总卡/明细表/返工分布渲染，成本降序（CAP-C-06）', async () => {
    renderPage('/app/analytics?tab=cost');

    // 汇总卡三数字 + 区标题
    expect(await screen.findByText('analytics.cost.attributionTitle')).toBeTruthy();
    expect(screen.getByText('analytics.cost.attributionAvgCost')).toBeTruthy();
    expect(screen.getByText('analytics.cost.attributionReworkCost')).toBeTruthy();
    expect(screen.getByText('analytics.cost.attributionReworkPct')).toBeTruthy();
    // 单位验收成本有值（acceptanceCount=2 → 3.75/2）
    expect(screen.getByText('$1.88')).toBeTruthy();
    // 明细表两行：acc-1 显示验收单标题；acc-2 无标题回落工单标题（两列同文 → 用 AllByText）
    expect(screen.getByText('验收单一')).toBeTruthy();
    expect(screen.getAllByText('工单二').length).toBeGreaterThan(0);
    // 返工分布条形列表（按工单类型；类型名在明细表与分布列表各出现一次 → 用 AllByText）
    expect(screen.getByText('analytics.cost.attributionReworkDist')).toBeTruthy();
    expect(screen.getAllByText('需求拆解').length).toBeGreaterThan(0);
    expect(screen.getAllByText('缺陷修复').length).toBeGreaterThan(0);
    // 每行一个返工计数（两行类型 → 两处键名文案）
    expect(screen.getAllByText('analytics.cost.attributionReworkCountUnit').length).toBe(2);
  });

  it('验收归因空态：无执行链成本时显示诚实空态而非全零假象', async () => {
    attributionMock.data = {
      totalExecutionCost: 0,
      reworkCost: 0,
      reworkPct: 0,
      acceptanceCount: 0,
      avgCostPerAcceptance: null,
      byAcceptance: [],
      byIssueType: [],
    };
    renderPage('/app/analytics?tab=cost');

    expect(await screen.findByText('analytics.cost.attributionEmptyTitle')).toBeTruthy();
    expect(screen.getByText('analytics.cost.attributionEmptyHint')).toBeTruthy();
    // 汇总卡与明细表不渲染（不给虚假 0）
    expect(screen.queryByText('analytics.cost.attributionAvgCost')).toBeNull();
    attributionMock.data = undefined; // 还原，避免影响后续用例
  });

  it('空态流：范围内无用量记录时展示空态，范围选择器仍保留（不被困在空范围）', async () => {
    usageMock.data = { totalTokens: 0, totalCost: 0, byModel: [], byDay: [] };
    renderPage('/app/analytics?tab=cost');

    expect(await screen.findByText('analytics.cost.emptyTitle')).toBeTruthy();
    expect(screen.getByText('analytics.cost.emptyHint')).toBeTruthy();
    // SelectField 为 base-ui 组合件，jsdom 无法 fireEvent 驱动弹层；空态下以 aria-label 断言其仍挂载
    expect(screen.getByLabelText('analytics.cost.range')).toBeTruthy();
    usageMock.data = undefined; // 还原，避免影响后续用例
  });
});
