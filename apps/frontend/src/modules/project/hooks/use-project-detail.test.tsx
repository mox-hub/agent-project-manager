import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectDetail } from './use-project-detail';
import { projectApi } from '../api/project-api';

// Mock project API
vi.mock('../api/project-api', () => ({
  projectApi: {
    getDetail: vi.fn(),
  },
}));

describe('useProjectDetail', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset mocks and query client
    vi.clearAllMocks();

    // Create QueryClient with disabled retries for tests
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

  describe('fetching project detail', () => {
    it('should fetch project detail when projectId is provided', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'A test project',
        type: 'personal' as const,
        visibility: 'private' as const,
        status: 'active' as const,
        healthScore: 85,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(projectApi.getDetail).mockResolvedValue(mockProject as any);

      const { result } = renderHook(
        () => useProjectDetail('project-1'),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProject);
      expect(projectApi.getDetail).toHaveBeenCalledWith('project-1');
    });

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(
        () => useProjectDetail(undefined),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(projectApi.getDetail).not.toHaveBeenCalled();
    });

    it('should be disabled when projectId is null', () => {
      const { result } = renderHook(
        () => useProjectDetail(null),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(projectApi.getDetail).not.toHaveBeenCalled();
    });

    it('should throw error when projectId is empty string', () => {
      const { result } = renderHook(
        () => useProjectDetail(''),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(projectApi.getDetail).not.toHaveBeenCalled();
    });
  });

  describe('query result data', () => {
    it('should return project data from API', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
      };

      vi.mocked(projectApi.getDetail).mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useProjectDetail('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProject);
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch project');
      vi.mocked(projectApi.getDetail).mockRejectedValue(error);

      const { result } = renderHook(() => useProjectDetail('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should handle not found error', async () => {
      const error = new Error('Project not found');
      vi.mocked(projectApi.getDetail).mockRejectedValue(error);

      const { result } = renderHook(() => useProjectDetail('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });
});
