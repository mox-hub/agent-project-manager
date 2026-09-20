import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider } from '@/shared/confirm/confirm-provider';
import { TaskPage } from './task-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
}));

const moveTaskMutateAsync = vi.fn(async () => undefined);

const taskItem = {
  id: 't1',
  title: 'Prepare release plan',
  status: 'todo',
  priority: 'medium',
};

vi.mock('../hooks/use-task-filter-options', () => ({
  useTaskFilterOptions: () => [],
}));

// useProjectTasks 委托到可控 mock：错误态/成功态场景分别注入（工厂内保持惰性读取，避免 TDZ）
const useProjectTasksMock = vi.fn();

vi.mock('../hooks/use-project-tasks', () => ({
  useProjectTasks: (...args: unknown[]) => useProjectTasksMock(...args),
  useMoveTask: () => ({
    mutateAsync: moveTaskMutateAsync,
  }),
  useCreateTask: () => ({
    mutateAsync: vi.fn(async () => undefined),
    isPending: false,
  }),
  useUpdateTask: () => ({
    mutateAsync: vi.fn(async () => undefined),
  }),
  useDeleteTask: () => ({
    mutateAsync: vi.fn(async () => undefined),
  }),
}));

vi.mock('@/components/ui/segmented-control', () => ({
  SegmentedControl: ({
    onChange,
    options,
  }: {
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div>
      {options.map((option) => (
        <button key={option.value} type="button" onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../components/task-board', () => ({
  TaskBoard: ({
    onTaskClick,
    onTaskMove,
  }: {
    onTaskClick?: (task: typeof taskItem) => void;
    onTaskMove?: (issueId: string, newStatus: string) => void;
  }) => (
    <div data-testid="task-view-board">
      <button type="button" onClick={() => onTaskClick?.(taskItem)}>
        Open Task
      </button>
      <button type="button" onClick={() => onTaskMove?.('t1', 'in_progress')}>
        Move Task
      </button>
    </div>
  ),
}));

vi.mock('../components/task-simple-list', () => ({
  TaskSimpleList: () => <div data-testid="task-view-list">LIST_VIEW</div>,
}));

vi.mock('../components/task-gantt', () => ({
  TaskGantt: () => <div data-testid="task-view-gantt">GANTT_VIEW</div>,
}));

vi.mock('../components/task-detail-drawer', () => ({
  TaskDetailDrawer: ({ issueId }: { issueId: string | null }) =>
    issueId ? <div data-testid="task-detail-drawer">{issueId}</div> : null,
}));

vi.mock('../components/task-import-export', () => ({
  TaskImportExport: () => <div data-testid="task-import-export" />,
}));

vi.mock('@/modules/project/components/dashboard/project-detail-nav', () => ({
  ProjectDetailNav: () => <div data-testid="project-detail-nav" />,
}));

vi.mock('@/shared/ui/filter-toolbar', () => ({
  FilterToolbar: () => <div data-testid="task-filter-toolbar" />,
}));

vi.mock('@/shared/components/create-dialog', () => ({
  UnifiedCreateDialog: () => null,
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const refetchMock = vi.fn(async () => undefined);

// 默认注入成功态（useQuery.data = TaskListResponse：{ data: Task[], meta }）
beforeEach(() => {
  useProjectTasksMock.mockReset();
  useProjectTasksMock.mockReturnValue({
    data: { data: [taskItem], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchMock,
  });
});

describe('TaskPage', () => {
  it('supports view switching, board move callback, and detail drawer open', async () => {
    const queryClient = createQueryClient();
    moveTaskMutateAsync.mockClear();

    render(
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <MemoryRouter initialEntries={['/app/projects/p1/issues']}>
            <Routes>
              <Route path="/app/projects/:projectId/issues" element={<TaskPage />} />
            </Routes>
          </MemoryRouter>
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Tasks Workspace')).toBeTruthy();
    expect(screen.getByTestId('task-view-board')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Move Task' }));
    expect(moveTaskMutateAsync).toHaveBeenCalledWith({ issueId: 't1', status: 'in_progress' });

    fireEvent.click(screen.getByRole('button', { name: 'Open Task' }));
    expect(screen.getByTestId('task-detail-drawer').textContent).toBe('t1');

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByTestId('task-view-list')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Gantt' }));
    expect(screen.getByTestId('task-view-gantt')).toBeTruthy();
  });

  it('renders error state with retry on query failure instead of list view', async () => {
    refetchMock.mockClear();
    // 请求失败（isError）：必须渲染错误态 + 重试，不得渲染任何列表/空态
    useProjectTasksMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Internal Server Error'),
      refetch: refetchMock,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ConfirmProvider>
          <MemoryRouter initialEntries={['/app/projects/p1/issues']}>
            <Routes>
              <Route path="/app/projects/:projectId/issues" element={<TaskPage />} />
            </Routes>
          </MemoryRouter>
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('加载失败')).toBeTruthy();
    expect(screen.getByText('Internal Server Error')).toBeTruthy();
    expect(screen.queryByTestId('task-view-board')).toBeNull();
    expect(screen.queryByTestId('task-view-list')).toBeNull();
    expect(screen.queryByText('暂无任务')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});
