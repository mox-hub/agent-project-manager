import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskGantt } from '@/modules/task/components/task-gantt';
import type { Task } from '@/modules/task/api/task-api';

function buildTask(partial: Partial<Task>): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Demo task',
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...partial,
  };
}

describe('TaskGantt', () => {
  it('maps task with start and due dates', () => {
    render(
      <TaskGantt
        tasks={[
          buildTask({
            id: 'task-a',
            title: 'Task A',
            startDate: '2026-03-10T00:00:00Z',
            dueDate: '2026-03-15T00:00:00Z',
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('gantt-bar-task-a')).toBeTruthy();
  });

  it('shows empty state when no task has due date', () => {
    render(
      <TaskGantt
        tasks={[
          buildTask({
            id: 'task-b',
            title: 'Task B',
            dueDate: null,
            startDate: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText('No tasks with valid dates to display')).toBeTruthy();
  });
});
