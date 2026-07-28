import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProjectTasks,
  useTaskDetail,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useMoveTask,
} from './use-project-tasks';

import { taskApi } from '../api/task-api';

// Mock task API
vi.mock('../api/task-api', () => ({
  taskApi: {
    getProjectTasks: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useProjectTasks', () => {
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

  describe('fetching project tasks', () => {
    it('should fetch tasks for a project', async () => {
      const mockTasks = {
        items: [
          {
            id: '1',
            title: 'Task 1',
            status: 'todo',
            projectId: 'project-1',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      vi.mocked(taskApi.getProjectTasks).mockResolvedValue(mockTasks as any);

      const { result } = renderHook(
        () => useProjectTasks('project-1', {}),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(taskApi.getProjectTasks).toHaveBeenCalledWith('project-1', {});
      expect(result.current.data).toEqual(mockTasks);
    });

    it('should be disabled when no projectId is provided', () => {
      const { result } = renderHook(
        () => useProjectTasks(undefined, {}),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(taskApi.getProjectTasks).not.toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch tasks');
      vi.mocked(taskApi.getProjectTasks).mockRejectedValue(error);

      const { result } = renderHook(
        () => useProjectTasks('project-1', {}),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('task detail', () => {
    it('should fetch task detail by taskId', async () => {
      const mockTask = {
        id: '1',
        title: 'Test Task',
      };

      vi.mocked(taskApi.getDetail).mockResolvedValue(mockTask as any);

      const { result } = renderHook(() => useTaskDetail('task-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(taskApi.getDetail).toHaveBeenCalledWith('task-1');
      expect(result.current.data).toEqual(mockTask);
    });
  });
});

describe('useCreateTask', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

  it('should create task successfully', async () => {
    const mockTask = {
      id: 'new-task-id',
      title: 'New Task',
    };

    vi.mocked(taskApi.create).mockResolvedValue({
      data: mockTask,
    } as any);

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    await result.current.mutateAsync({
      title: 'New Task',
      status: 'todo',
      projectId: 'project-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(taskApi.create).toHaveBeenCalledWith({
      title: 'New Task',
      status: 'todo',
      projectId: 'project-1',
    });
  });

  it('should handle create errors', async () => {
    const error = new Error('Failed to create task');
    vi.mocked(taskApi.create).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    await expect(result.current.mutateAsync({
      projectId: 'test-project-id',
      title: 'Test',
    })).rejects.toThrow('Failed to create task');
  });
});

describe('useUpdateTask', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

  it('should update task successfully', async () => {
    const updatedTask = {
      id: '1',
      title: 'Updated Task',
    };

    vi.mocked(taskApi.update).mockResolvedValue({
      data: updatedTask,
    } as any);

    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    await result.current.mutateAsync({
      taskId: '1',
      data: {
        title: 'Updated Task',
        status: 'in_progress',
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(taskApi.update).toHaveBeenCalledWith('1', {
      title: 'Updated Task',
      status: 'in_progress',
    });
  });

  it('should handle update errors', async () => {
    const error = new Error('Failed to update task');
    vi.mocked(taskApi.update).mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    await expect(result.current.mutateAsync({
      taskId: '1',
      data: { title: 'Test' },
    })).rejects.toThrow('Failed to update task');
  });
});

describe('useDeleteTask', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

  it('should delete task successfully', async () => {
    vi.mocked(taskApi.delete).mockResolvedValue({
      data: { message: 'Task deleted' },
    } as any);

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    await result.current.mutateAsync('task-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(taskApi.delete).toHaveBeenCalledWith('task-1');
  });

  it('should handle delete errors', async () => {
    const error = new Error('Failed to delete task');
    vi.mocked(taskApi.delete).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    await expect(result.current.mutateAsync('task-1')).rejects.toThrow('Failed to delete task');
  });
});

describe('useMoveTask', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

  it('should move task successfully', async () => {
    vi.mocked(taskApi.update).mockResolvedValue({
      data: { id: '1', status: 'in_progress' },
    } as any);

    const { result } = renderHook(() => useMoveTask(), { wrapper });

    await result.current.mutateAsync({
      taskId: '1',
      status: 'in_progress',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(taskApi.update).toHaveBeenCalledWith('1', {
      status: 'in_progress',
    });
  });

  it('should handle move errors', async () => {
    const error = new Error('Failed to move task');
    vi.mocked(taskApi.update).mockRejectedValue(error);

    const { result } = renderHook(() => useMoveTask(), { wrapper });

    await expect(result.current.mutateAsync({
      taskId: '1',
      status: 'done',
    })).rejects.toThrow('Failed to move task');
  });
});
