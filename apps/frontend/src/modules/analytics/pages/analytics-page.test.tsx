import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createTestQueryClient } from '@/test-utils/providers';
import { AnalyticsPage, getAvailableAnalyticsTabs } from './analytics-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'zh-CN' },
  }),
  // '@/hooks/useTranslation' → '@/i18n' 初始化链需要 initReactI18next 插件对象
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

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

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AnalyticsPage 可用 Tab 计算（CAP-C-06 消费面去重）', () => {
  it('生产模式仅保留 overview，四个 mock Tab 不出现', () => {
    const prod = getAvailableAnalyticsTabs(false);
    expect(prod.map((d) => d.value)).toEqual(['overview']);
  });

  it('DEV 模式四个 mock Tab（cost/quality/risk/team）存在', () => {
    const dev = getAvailableAnalyticsTabs(true);
    expect(dev.map((d) => d.value)).toEqual(['overview', 'cost', 'quality', 'risk', 'team']);
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

  it('标题走 i18n（analytics.title）；DEV 测试环境四个 mock Tab 仍在工具栏', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: '分析' })).toBeTruthy();
    // vitest 运行在 DEV 模式（import.meta.env.DEV = true），mock Tab 标签仍在
    expect(screen.getAllByText('成本').length).toBeGreaterThan(0);
    expect(screen.getAllByText('质量').length).toBeGreaterThan(0);
    expect(screen.getAllByText('风险').length).toBeGreaterThan(0);
    expect(screen.getAllByText('团队').length).toBeGreaterThan(0);
  });
});
