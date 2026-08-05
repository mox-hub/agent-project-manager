import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GanttChart } from '@/shared/components/gantt-chart';

describe('GanttChart', () => {
  it('renders rows and bars', () => {
    render(
      <GanttChart
        items={[
          {
            id: 'task-1',
            title: 'Task One',
            startDate: '2026-03-10',
            endDate: '2026-03-12',
          },
        ]}
      />,
    );

    expect(screen.getByTestId('gantt-bar-task-1')).toBeTruthy();
  });

  it('renders drag handles when editable', () => {
    render(
      <GanttChart
        items={[
          {
            id: 'task-1',
            title: 'Task One',
            startDate: '2026-03-10',
            endDate: '2026-03-12',
          },
        ]}
      />,
    );
    expect(screen.getByTestId('gantt-handle-start-task-1')).toBeTruthy();
    expect(screen.getByTestId('gantt-handle-end-task-1')).toBeTruthy();
  });

  it('renders empty state', () => {
    render(<GanttChart items={[]} emptyMessage="Empty timeline" />);
    expect(screen.getByText('Empty timeline')).toBeTruthy();
  });
});
