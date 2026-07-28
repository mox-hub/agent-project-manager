import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectList } from './use-project-list';
import { projectApi } from '../api/project-api';

// Mock the API
vi.mock('../api/project-api', () => ({
  projectApi: {
    getList: vi.fn(),
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
    const mockListResponse = {
      items: [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    };

    vi.mocked(projectApi.getList).mockResolvedValue(mockListResponse as any);

    const { result } = renderHook(() => useProjectList({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockListResponse);
    expect(projectApi.getList).toHaveBeenCalledWith({});
  });

  it('should handle pagination', async () => {
    const mockListResponse = {
      items: [],
      page: 2,
      pageSize: 10,
      total: 20,
      totalPages: 2,
    };

    vi.mocked(projectApi.getList).mockResolvedValue(mockListResponse as any);

    const { result } = renderHook(
      () => useProjectList({ page: 2, pageSize: 10 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(projectApi.getList).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
    });
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch');
    vi.mocked(projectApi.getList).mockRejectedValue(error);

    const { result } = renderHook(() => useProjectList({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
