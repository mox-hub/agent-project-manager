import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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

vi.mock('../hooks/use-project-tasks', () => ({
  useProjectTasks: () => ({
    data: { items: [taskItem], total: 1, page: 1, pageSize: 20 },
    isLoading: false,
  }),
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
    onTaskMove?: (taskId: string, newStatus: string) => void;
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
  TaskDetailDrawer: ({ taskId }: { taskId: string | null }) =>
    taskId ? <div data-testid="task-detail-drawer">{taskId}</div> : null,
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

vi.mock('@/components/ui/unified-create-dialog', () => ({
  UnifiedCreateDialog: () => null,
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('TaskPage', () => {
  it('supports view switching, board move callback, and detail drawer open', async () => {
    const queryClient = createQueryClient();
    moveTaskMutateAsync.mockClear();

    render(
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <MemoryRouter initialEntries={['/app/projects/p1/tasks']}>
            <Routes>
              <Route path="/app/projects/:projectId/tasks" element={<TaskPage />} />
            </Routes>
          </MemoryRouter>
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Tasks Workspace')).toBeTruthy();
    expect(screen.getByTestId('task-view-board')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Move Task' }));
    expect(moveTaskMutateAsync).toHaveBeenCalledWith({ taskId: 't1', status: 'in_progress' });

    fireEvent.click(screen.getByRole('button', { name: 'Open Task' }));
    expect(screen.getByTestId('task-detail-drawer').textContent).toBe('t1');

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByTestId('task-view-list')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Gantt' }));
    expect(screen.getByTestId('task-view-gantt')).toBeTruthy();
  });
});
