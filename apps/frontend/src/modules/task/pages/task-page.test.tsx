import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TaskPage } from './task-page';

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
    data: { data: [taskItem] },
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

vi.mock('../components/task-list', () => ({
  TaskList: () => <div data-testid="task-view-list">LIST_VIEW</div>,
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

describe('TaskPage', () => {
  it('supports view switching, board move callback, and detail drawer open', async () => {
    moveTaskMutateAsync.mockClear();

    render(
      <MemoryRouter initialEntries={['/app/projects/p1/tasks']}>
        <Routes>
          <Route path="/app/projects/:projectId/tasks" element={<TaskPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tasks Workspace')).toBeTruthy();
    expect(screen.getByTestId('task-view-board')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Move Task' }));
    expect(moveTaskMutateAsync).toHaveBeenCalledWith({ taskId: 't1', status: 'in_progress' });

    fireEvent.click(screen.getByRole('button', { name: 'Open Task' }));
    expect(screen.getByTestId('task-detail-drawer').textContent).toBe('t1');

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByTestId('task-view-list')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByTestId('task-view-gantt')).toBeTruthy();
  });
});
