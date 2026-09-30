import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './dashboard-page';
import type { DashboardOverview } from '../api/dashboard-api';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const overview: DashboardOverview = {
  team: { totalMembers: 3, activeTasks: 5, avgLoadPct: 42, members: [] },
  ai: { conversations: 12, weeklyGrowth: 3, tokensUsed: 45_000, topActivities: [] },
  cost: {
    monthTotal: 14.02,
    budgetDeltaPct: -8,
    byCategory: [
      { name: 'claude-code', amount: 13.91, percentage: 99 },
      { name: 'deepseek', amount: 0.11, percentage: 1 },
    ],
  },
  delivery: { activeTasks: 5, totalTasks: 20, byPriority: [], criticalBugs: 1, openBugs: 2, resolvedBugs: 7 },
  health: { avgScore: 78, projects: [] },
  risks: { mitigationRatePct: 50, items: [] },
  trends: {
    productivity: [
      { date: '2026-09-29', tasks: 4, velocity: 6, quality: 100 },
      { date: '2026-09-30', tasks: 2, velocity: 3, quality: 50 },
    ],
    health: [
      { week: 'W1', score: 73 },
      { week: 'W2', score: 79 },
    ],
    performance: [
      { metric: 'Velocity', value: 23 },
      { metric: 'Quality', value: 97 },
    ],
  },
};

let mockData: DashboardOverview | undefined = overview;

vi.mock('../hooks/use-dashboard-overview', () => ({
  useDashboardOverview: () => ({
    data: mockData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/shared/ai/identifiers', () => ({
  CORE_AI_PAGE_IDS: { dashboardOverview: 'dashboard-overview' },
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage overview panels', () => {
  beforeEach(() => {
    mockData = overview;
  });

  it('renders the four chart panels with lieflat-style encoding hints', () => {
    renderPage();

    // 结论式标题（数据 tasks 6 < velocity 9 → creation outpacing）
    expect(screen.getByText('Delivery pace · creation outpacing')).toBeTruthy();
    expect(screen.getByText('Health Score Trend')).toBeTruthy();
    expect(screen.getByText('Team Performance')).toBeTruthy();
    expect(screen.getByText('Cost Overview')).toBeTruthy();
    // 编码说明 hint（一柱 = 一天 · 质量 N%）
    expect(screen.getByText('one bar = one day · Quality 50%')).toBeTruthy();
    expect(screen.getByText('scale 0-100 · one bar = one week')).toBeTruthy();
    // 来源行签名
    expect(screen.getByText('DELIVERY · LAST 7 DAYS')).toBeTruthy();
    // 图表可访问性：每图有概括结论的 img role（宪法 §17.6）
    expect(screen.getByRole('img', { name: 'Weekly project health score out of 100' })).toBeTruthy();
  });

  it('exposes deep-read entries on health and delivery cards', () => {
    renderPage();

    const entries = screen.getAllByRole('button', { name: 'Deep read' });
    expect(entries.length).toBe(2);
  });

  it('renders EmptyState instead of a bare coordinate system when productivity is all-zero (§17.5)', () => {
    mockData = {
      ...overview,
      trends: {
        ...overview.trends,
        productivity: overview.trends.productivity.map((item) => ({
          ...item,
          tasks: 0,
          velocity: 0,
        })),
      },
    };
    renderPage();

    expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: 'Tasks completed vs created per day recently' })).toBeNull();
  });

  it('成本卡预算基线未设置（null）：显示诚实降级文案而非虚假 0%（CAP-C-06）', () => {
    mockData = {
      ...overview,
      cost: { ...overview.cost, budgetDeltaPct: null },
    };
    renderPage();

    // 测试环境语言探测解析为 en（jsdom navigator），断言英文文案
    expect(screen.getByText('Budget baseline not set')).toBeTruthy();
    // 不再出现虚假的百分比口径
    expect(screen.queryByText('0% under budget')).toBeNull();
  });

  it('成本卡预算基线有值时仍显示偏差百分比', () => {
    renderPage();

    expect(screen.getByText('8% under budget')).toBeTruthy();
  });
});
