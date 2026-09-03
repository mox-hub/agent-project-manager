import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskRowsList } from './task-rows';
import type { Task } from '../api/task-api';

const baseTask = (overrides: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Task title',
  status: 'todo',
  priority: 'medium',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const tasks: Task[] = [
  baseTask({
    id: 't1',
    shortId: 'APM-1',
    title: 'Parent task',
    status: 'in_progress',
    priority: 'high',
    milestone: { id: 'm1', name: 'Phase 1', status: 'active' },
    todoItems: [
      { id: 'c1', content: 'a', completed: true, order: 0 },
      { id: 'c2', content: 'b', completed: false, order: 1 },
    ],
  }),
  baseTask({
    id: 't2',
    title: 'Child task',
    status: 'in_progress',
    parentTaskId: 't1',
  }),
  baseTask({
    id: 't3',
    title: 'Done task',
    status: 'done',
  }),
];

describe('TaskRowsList', () => {
  it('renders status groups with counts and task rows', () => {
    render(<TaskRowsList tasks={tasks} />);

    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('APM-1')).toBeTruthy();
    expect(screen.getByText('Parent task')).toBeTruthy();
    expect(screen.getByText('Child task')).toBeTruthy();
    expect(screen.getByText('Done task')).toBeTruthy();
    // 分组计数包含子任务行
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('invokes onTaskClick when a row is clicked', () => {
    const onTaskClick = vi.fn();
    render(<TaskRowsList tasks={tasks} onTaskClick={onTaskClick} />);

    fireEvent.click(screen.getByText('Parent task'));
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('collapses and expands a group via the header', () => {
    render(<TaskRowsList tasks={tasks} />);

    fireEvent.click(screen.getByText('Done'));
    expect(screen.queryByText('Done task')).toBeNull();

    fireEvent.click(screen.getByText('Done'));
    expect(screen.getByText('Done task')).toBeTruthy();
  });

  it('exposes onCreateTask from the group footer row', () => {
    const onCreateTask = vi.fn();
    render(<TaskRowsList tasks={tasks} onCreateTask={onCreateTask} />);

    // 分组顺序为 todo → in_progress → …，当前数据首组是 in_progress
    const footer = screen.getAllByText('Add task')[0];
    fireEvent.click(footer);
    expect(onCreateTask).toHaveBeenCalledWith('in_progress');
  });

  it('renders secondaryLabel in the name slot', () => {
    render(<TaskRowsList tasks={tasks} secondaryLabel={() => 'My Project'} />);

    const slots = screen.getAllByText('My Project');
    expect(slots.length).toBeGreaterThan(0);
  });

  it('shows loading and empty states', () => {
    const { rerender } = render(<TaskRowsList tasks={[]} loading />);
    expect(screen.getByText('Loading tasks...')).toBeTruthy();

    rerender(<TaskRowsList tasks={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('nests subtasks under their parent within the same status group', () => {
    render(<TaskRowsList tasks={tasks} />);

    const child = screen.getByText('Child task').closest('div');
    expect(child?.className).toContain('pl-5');
    expect(within(document.body).getAllByText('Child task').length).toBe(1);
  });
});
