import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectApi } from '../api/project-api';
import { useProjectDashboardSummary } from './use-project-dashboard-summary';

vi.mock('../api/project-api', () => ({
  projectApi: {
    getDashboardSummary: vi.fn(),
  },
}));

describe('useProjectDashboardSummary', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch dashboard summary', async () => {
    vi.mocked(projectApi.getDashboardSummary).mockResolvedValue({
      data: {
        projectMeta: { id: 'p1', name: 'Demo', members: [] },
        taskStats: { total: 0, todo: 0, inProgress: 0, inReview: 0, done: 0, overdue: 0 },
        boardPreview: [],
        health: { currentScore: 0, trend30d: 0, latestBreakdown: null },
        ai: { score: 0, complexity: null, lifecycle: null, teamSize: null, summary: null, lastComputedAt: null },
        teamWorkload: [],
        activityFeed: [],
        milestones: [],
        iterations: [],
        integrations: { repositories: [], externalLinksCount: 0, docLinksCount: 0, apiDocLinksCount: 0 },
      },
    } as any);

    const { result } = renderHook(() => useProjectDashboardSummary('p1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(projectApi.getDashboardSummary).toHaveBeenCalledWith('p1');
  });

  it('should stay idle when projectId is undefined', () => {
    const { result } = renderHook(() => useProjectDashboardSummary(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(projectApi.getDashboardSummary).not.toHaveBeenCalled();
  });
});
