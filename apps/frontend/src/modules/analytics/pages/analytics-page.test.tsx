import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createTestQueryClient } from '@/test-utils/providers';
import { AnalyticsPage } from './analytics-page';

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

describe('AnalyticsPage', () => {
  it('renders analytics overview content', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeTruthy();
    expect(await screen.findByText('项目健康')).toBeTruthy();
    expect(screen.getByText(/风险聚焦/)).toBeTruthy();
    expect(screen.getByText('示例项目')).toBeTruthy();
  });

  it('renders toolbar tabs in chinese', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeTruthy();
    // SegmentedControl 标签 + 视图下拉胶囊可能同名词，断言至少存在
    expect(screen.getAllByText('成本').length).toBeGreaterThan(0);
    expect(screen.getAllByText('质量').length).toBeGreaterThan(0);
    expect(screen.getAllByText('风险').length).toBeGreaterThan(0);
    expect(screen.getAllByText('团队').length).toBeGreaterThan(0);
  });
});
