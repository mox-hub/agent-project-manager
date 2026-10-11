/**
 * WorkflowTableView 行为级测试（CAP-A-29 / GAP-T-66）
 * 覆盖：行渲染（名称/文法版本/标识）/ 行点击进详情 /
 * 「运行」按钮 stopPropagation（onTrigger 触发且不触发行点击）。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowTableView } from './workflow-table-view';
import type { WorkflowSummary } from '../api/workflow-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const workflows: WorkflowSummary[] = [
  { id: 'wf1', key: 'weekly-report', name: 'Weekly Report', description: '周报生成', version: 1, grammarVersion: 2 },
  { id: 'wf2', key: 'night-patrol', name: 'Night Patrol', version: 1 },
];

describe('WorkflowTableView（CAP-A-29 表格视图）', () => {
  it('renders workflow rows with key and grammar badge', () => {
    render(<WorkflowTableView workflows={workflows} onWorkflowClick={vi.fn()} onTrigger={vi.fn()} />);

    expect(screen.getByText('Weekly Report')).toBeTruthy();
    expect(screen.getByText('weekly-report')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
  });

  it('row click reports to onWorkflowClick', () => {
    const onWorkflowClick = vi.fn();
    render(<WorkflowTableView workflows={workflows} onWorkflowClick={onWorkflowClick} onTrigger={vi.fn()} />);

    fireEvent.click(screen.getByText('Weekly Report'));
    expect(onWorkflowClick).toHaveBeenCalledTimes(1);
    expect(onWorkflowClick.mock.calls[0][0].id).toBe('wf1');
  });

  it('run button triggers onTrigger without firing the row click', () => {
    const onWorkflowClick = vi.fn();
    const onTrigger = vi.fn();
    render(
      <WorkflowTableView
        workflows={workflows}
        onWorkflowClick={onWorkflowClick}
        onTrigger={onTrigger}
      />,
    );

    const runButtons = screen.getAllByText('workflow.run');
    fireEvent.click(runButtons[0]);

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger.mock.calls[0][0].id).toBe('wf1');
    expect(onWorkflowClick).not.toHaveBeenCalled();
  });

  it('renders the empty content when no workflows', () => {
    render(<WorkflowTableView workflows={[]} onWorkflowClick={vi.fn()} onTrigger={vi.fn()} />);
    expect(screen.getByText('workflow.empty')).toBeTruthy();
  });
});
