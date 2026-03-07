import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProjectHealthSnapshots,
} from './use-project-health';
import { projectApi } from '../api/project-api';

// Mock project API
vi.mock('../api/project-api', () => ({
  projectApi: {
    getHealthSnapshots: vi.fn(),
  },
}));

describe('useProjectHealthSnapshots', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset mocks and query client
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('basic functionality', () => {
    it('should fetch health snapshots', async () => {
      const mockSnapshots = {
        data: [
          {
            id: '1',
            date: '2024-01-01T00:00:00Z',
            healthScore: 85,
            breakdown: {
              iterationCompletionRate: 90,
              overdueTaskRatio: 5,
              ciSuccessRate: 95,
              commitActivity: 80,
              blockedTaskRatio: 2,
            },
          },
        ],
      };

      vi.mocked(projectApi.getHealthSnapshots).mockResolvedValue(
        mockSnapshots as any
      );

      const { result } = renderHook(
        () => useProjectHealthSnapshots('project-1'),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSnapshots);
      expect(projectApi.getHealthSnapshots).toHaveBeenCalledWith('project-1');
    });

    it('should be disabled when no projectId is provided', () => {
      const { result } = renderHook(
        () => useProjectHealthSnapshots(),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(projectApi.getHealthSnapshots).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch health snapshots');
      vi.mocked(projectApi.getHealthSnapshots).mockRejectedValue(error);

      const { result } = renderHook(
        () => useProjectHealthSnapshots('project-1'),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });
});
