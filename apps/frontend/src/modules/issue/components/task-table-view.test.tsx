import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskTableView } from './task-table-view';
import type { Task } from '../api/issue-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('../hooks/use-issue-types', () => ({
  useIssueTypes: () => ({ types: [], byId: new Map(), byKey: new Map() }),
  useIssueTypeOf: () => () => undefined,
}));

const buildTask = (overrides: Partial<Task>): Task =>
  ({
    id: overrides.title === 'Alpha' ? 't1' : 't2',
    title: overrides.title ?? 'task',
    status: 'todo',
    priority: 'medium',
    projectId: 'p1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  }) as Task;

const tasks: Task[] = [
  buildTask({ title: 'Alpha', priority: 'high' }),
  buildTask({ title: 'Beta', priority: 'low' }),
];

describe('TaskTableView（P1-14 表格排序与列显隐）', () => {
  it('reports header sort clicks to the page-level onSortChange callback', () => {
    const onSortChange = vi.fn();
    render(
      <TaskTableView
        tasks={tasks}
        sorting={{ orderBy: 'priority', orderDirection: 'desc' }}
        onSortChange={onSortChange}
      />,
    );

    // 此前列只有 id 无 accessorFn → getCanSort 恒 false → 表头是死开关；现在点击上报排序
    fireEvent.click(screen.getByRole('button', { name: /Status/ }));

    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onSortChange).toHaveBeenCalledWith('status', 'asc');
  });

  it('reorders rows according to the controlled sorting prop (desc by priority rank)', () => {
    render(
      <TaskTableView tasks={tasks} sorting={{ orderBy: 'priority', orderDirection: 'desc' }} />,
    );

    const titles = screen
      .getAllByText(/Alpha|Beta/)
      .map((el) => el.textContent);
    expect(titles[0]).toBe('Alpha');
  });

  it('hides columns toggled off by displayProperties and keeps the rest', () => {
    render(<TaskTableView tasks={tasks} displayProperties={{ status: false, aiExecution: false }} />);

    expect(screen.queryByText('Status')).toBeNull();
    expect(screen.queryByText('AI 接管状态')).toBeNull();
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Priority')).toBeTruthy();
  });

  it('shows every property column by default when displayProperties is omitted', () => {
    render(<TaskTableView tasks={tasks} />);

    for (const header of ['ID', 'Title', 'AI 接管状态', 'Status', 'Priority', 'Assignee', 'Project', 'Estimate', 'Due Date', 'Labels', 'Created', 'Updated']) {
      expect(screen.getByText(header)).toBeTruthy();
    }
  });
});
