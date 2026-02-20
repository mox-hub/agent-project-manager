import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectList } from './use-project-list';
import { projectApi } from '../../api/project-api';

// Mock the API
vi.mock('../../api/project-api', () => ({
  projectApi: {
    getProjects: vi.fn(),
  },
}));

describe('useProjectList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch project list', async () => {
    const mockProjects = {
      data: [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    };

    vi.mocked(projectApi.getProjects).mockResolvedValue(mockProjects);

    const { result } = renderHook(() => useProjectList({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProjects);
    expect(projectApi.getProjects).toHaveBeenCalledWith({});
  });

  it('should handle pagination', async () => {
    const mockProjects = {
      data: [],
      meta: {
        page: 2,
        pageSize: 10,
        total: 20,
        totalPages: 2,
      },
    };

    vi.mocked(projectApi.getProjects).mockResolvedValue(mockProjects);

    const { result } = renderHook(
      () => useProjectList({ page: 2, pageSize: 10 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(projectApi.getProjects).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
    });
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch');
    vi.mocked(projectApi.getProjects).mockRejectedValue(error);

    const { result } = renderHook(() => useProjectList({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
