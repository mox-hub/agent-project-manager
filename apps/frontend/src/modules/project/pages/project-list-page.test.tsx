import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProjectListPage } from './project-list-page';

const store = {
  projectListVisibleColumns: ['icon', 'name', 'status'],
  setProjectListVisibleColumns: vi.fn(),
};

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (state: typeof store) => unknown) => selector(store),
}));

vi.mock('../hooks/use-project-list', () => ({
  useProjectList: () => ({
    data: {
      data: [
        { id: 'p1', name: 'Nebula Core', status: 'active' },
        { id: 'p2', name: 'Agent Shell', status: 'active' },
      ],
      meta: { page: 1, totalPages: 1, total: 2, pageSize: 20 },
    },
    isLoading: false,
  }),
}));

vi.mock('../hooks/use-project-mutations', () => ({
  useCreateProject: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(async () => undefined) }),
}));

vi.mock('../hooks/use-project-filter-options', () => ({
  useProjectFilterOptions: () => [],
}));

vi.mock('@/modules/core-config/hooks/use-metadata', () => ({
  useProjectTemplates: () => ({ data: [] }),
}));

vi.mock('../components/project-list', () => ({
  ProjectList: () => <div data-testid="project-view-list">LIST_VIEW</div>,
}));

vi.mock('../components/project-board', () => ({
  ProjectBoard: () => <div data-testid="project-view-board">BOARD_VIEW</div>,
}));

vi.mock('../components/project-gantt', () => ({
  ProjectGantt: () => <div data-testid="project-view-gantt">GANTT_VIEW</div>,
}));

vi.mock('@/components/view-switcher', () => ({
  ViewSwitcher: ({
    onValueChange,
  }: {
    onValueChange: (value: 'list' | 'board' | 'gantt') => void;
  }) => (
    <div>
      <button type="button" onClick={() => onValueChange('list')}>List</button>
      <button type="button" onClick={() => onValueChange('board')}>Board</button>
      <button type="button" onClick={() => onValueChange('gantt')}>Timeline</button>
    </div>
  ),
}));

vi.mock('@/shared/ui/filter-panel', () => ({
  FilterPanel: () => <div data-testid="filter-panel" />,
}));

describe('ProjectListPage', () => {
  it('switches between list/board/gantt views', async () => {
    render(
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeTruthy();
    expect(screen.getByTestId('project-view-list')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Board' }));
    expect(screen.getByTestId('project-view-board')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByTestId('project-view-gantt')).toBeTruthy();
  });
});
