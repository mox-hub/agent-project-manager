import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/modules/project/components/dashboard/project-detail-frame', () => ({
  ProjectDetailFrame: ({ children, projectName, title, description, actions }: any) => (
    <div data-testid="project-detail-frame">
      <h1>{projectName}</h1>
      <p>{title}</p>
      {description}
      {actions}
      {children}
    </div>
  ),
}));

vi.mock('@/modules/project/components/dashboard/project-detail-nav', () => ({
  ProjectDetailNav: () => <div data-testid="project-detail-nav" />,
}));

vi.mock('@/modules/project/components/dashboard/project-right-sidebar', () => ({
  ProjectRightSidebar: () => <div data-testid="project-right-sidebar" />,
}));

vi.mock('@/modules/project/components/dashboard/project-sidebar-context', () => ({
  useProjectSidebar: () => null,
  ProjectSidebarProvider: ({ children }: any) => children,
}));

vi.mock('@/modules/project/components/dashboard/ai-insight-card', () => ({
  AiInsightCard: () => <div data-testid="ai-insight-card">AI Insights</div>,
}));

vi.mock('@/modules/project/components/dashboard/integration-status-strip', () => ({
  IntegrationStatusStrip: () => <div data-testid="integration-status-strip" />,
}));

vi.mock('@/modules/project/components/dashboard/project-health-score-dialog', () => ({
  ProjectHealthScoreDialog: () => null,
}));

vi.mock('@/shared/ai/identifiers', () => ({
  CORE_AI_PAGE_IDS: { projectDashboard: 'project-dashboard' },
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

function renderPage() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/projects/p1']}>
        <Routes>
          <Route path="/app/projects/:projectId" element={<ProjectDashboardPage />} />
          <Route
            path="/app/projects/:projectId/tasks"
            element={<div>tasks-page-marker</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProjectDashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    refreshMutate.mockClear();
  });

  it('renders overview with stat cards and charts', () => {
    renderPage();

    expect(screen.getByText('Nebula Core')).toBeTruthy();
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Tasks Completed')).toBeTruthy();
    expect(screen.getByText('Project Health')).toBeTruthy();
    expect(screen.getByText('Team Velocity')).toBeTruthy();
    expect(screen.getByText('Overdue Tasks')).toBeTruthy();
    expect(screen.getByText('Sprint Burndown')).toBeTruthy();
    expect(screen.getByText('Task Distribution')).toBeTruthy();
    expect(screen.getByTestId('ai-insight-card')).toBeTruthy();
    expect(screen.getByTestId('integration-status-strip')).toBeTruthy();
  });

  it('no longer renders the analytics panel or sprint velocity chart', () => {
    renderPage();

    expect(screen.queryByText('Analytics Modules')).toBeNull();
    expect(screen.queryByText('Sprint Velocity')).toBeNull();
  });

  it('navigates to tasks page when the overdue card is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Overdue Tasks/ }));

    expect(screen.getByText('tasks-page-marker')).toBeTruthy();
  });
});
