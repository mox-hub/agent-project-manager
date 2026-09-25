import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskGantt } from '@/modules/issue/components/task-gantt';
import type { Task } from '@/modules/issue/api/issue-api';

// 与仓内其他组件测试同口径：t 直接返回 key（或 defaultValue），断言用 key
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
}));

function buildTask(partial: Partial<Task>): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Demo task',
    status: 'todo',
    priority: 'medium',
    assigneeType: 'user',
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

    expect(screen.getByText('task.gantt.empty')).toBeTruthy();
  });
});
