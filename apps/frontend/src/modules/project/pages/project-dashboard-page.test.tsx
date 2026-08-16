import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectDashboardPage } from './project-dashboard-page';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

vi.mock('@/modules/task/hooks/use-project-tasks', () => ({
  useCreateTask: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const refreshMutate = vi.fn();

vi.mock('../hooks/use-project-health', () => ({
  useRefreshAIContext: () => ({
    mutate: refreshMutate,
    isPending: false,
  }),
}));

const summary = {
  projectMeta: {
    id: 'p1',
    name: 'Nebula Core',
    description: 'Demo project',
    type: 'team',
    status: 'active',
    visibility: 'internal',
    members: [],
  },
  taskStats: { total: 10, todo: 2, inProgress: 3, inReview: 1, done: 4, overdue: 1 },
  boardPreview: [],
  health: {
    currentScore: 88,
    trend30d: 4,
    latestBreakdown: null,
    lastEvaluatedAt: '2026-03-15T00:00:00.000Z',
    details: [
      {
        key: 'code_quality',
        label: 'Code Quality',
        score: 85,
        weight: 0.25,
        status: 'on_track',
        source: 'health_snapshot',
        available: true,
      },
    ],
  },
  ai: {
    score: 82,
    complexity: 'high',
    lifecycle: 'development',
    teamSize: 'small',
    summary: 'AI summary',
    lastComputedAt: '2026-03-15T01:00:00.000Z',
    details: {
      riskBreakdown: [{ key: 'overdue', label: 'Overdue Risk', value: 34 }],
      complexityBreakdown: [{ key: 'complexity', label: 'Complexity', value: 70 }],
    },
  },
  analytics: {
    deliveryTimeline: [{ date: '2026-03-10', healthScore: 84, deliveryScore: 79, completionRate: 79 }],
    workloadDistribution: [{ key: 'u1', label: 'Alice', value: 55 }],
    aiRiskDistribution: [{ key: 'r1', label: 'Overdue Risk', value: 34 }],
    aiComplexityDistribution: [{ key: 'c1', label: 'Complexity', value: 70 }],
  },
  teamWorkload: [],
  activityFeed: [],
  milestones: [],
  iterations: [],
  integrations: {
    repositories: [{ id: 'repo1', name: 'repo1', validationStatus: 'ok' }],
    externalLinksCount: 1,
    docLinksCount: 2,
    apiDocLinksCount: 1,
  },
};

vi.mock('../hooks/use-project-dashboard-summary', () => ({
  useProjectDashboardSummary: () => ({
    data: summary,
    isLoading: false,
    isError: false,
    error: null,
  }),
  selectProjectHealthDetails: (value: any) => value?.health?.details ?? [],
  selectProjectAnalytics: (value: any) => value?.analytics,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('../components/dashboard/project-detail-frame', () => ({
  ProjectDetailFrame: ({ children, projectName }: any) => (
    <div data-testid="project-detail-frame">
      <h1>{projectName}</h1>
      {children}
    </div>
  ),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('ProjectDashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    refreshMutate.mockClear();
  });

  it('renders stylized overview modules', () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/projects/p1']}>
          <Routes>
            <Route path="/app/projects/:projectId" element={<ProjectDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Nebula Core')).toBeTruthy();
    expect(screen.getByText('Project Health')).toBeTruthy();
    expect(screen.getByText('AI Insights')).toBeTruthy();
    expect(screen.getByText('Analytics Modules')).toBeTruthy();
  });

  it('renders normally when localStorage has module preferences', () => {
    localStorage.setItem(
      'project-dashboard-modules:p1',
      JSON.stringify({ delivery: false, aiRisk: true, workload: true }),
    );

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/projects/p1']}>
          <Routes>
            <Route path="/app/projects/:projectId" element={<ProjectDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Analytics Modules')).toBeTruthy();
  });
});
