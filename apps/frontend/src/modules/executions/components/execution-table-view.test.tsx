/**
 * ExecutionTableView 行为级测试（CAP-A-29 扩展切片 / GAP-T-66）
 * 覆盖：行渲染（目标/状态徽标/执行者）/ 行点击开详情 / 右键菜单回调。
 * run-status 与 run-details-format 均为纯模块，不整桩。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionTableView } from './execution-table-view';
import type { ExecutionRunRecord } from '../api/execution-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const buildRun = (overrides: Partial<ExecutionRunRecord>): ExecutionRunRecord =>
  ({
    id: overrides.goal === 'Alpha' ? 'r1' : 'r2',
    projectId: 'p1',
    subjectType: 'platform_ai_member',
    subjectId: 'm1',
    subjectName: '小周',
    identitySource: 'internal',
    goal: overrides.goal ?? 'run',
    status: 'in_progress',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T01:00:00Z',
    totalTokens: 1234,
    totalCost: 0.56,
    providerId: 'opencode-go',
    ...overrides,
  }) as ExecutionRunRecord;

const runs: ExecutionRunRecord[] = [
  buildRun({ goal: 'Alpha', status: 'in_progress' }),
  buildRun({ goal: 'Beta', status: 'failed' }),
];

describe('ExecutionTableView（CAP-A-29 扩展切片）', () => {
  it('renders run rows with goal, agent and provider columns', () => {
    render(<ExecutionTableView runs={runs} onRunClick={vi.fn()} />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getAllByText('小周').length).toBe(2);
    expect(screen.getAllByText('opencode-go').length).toBe(2);
  });

  it('row click reports to onRunClick', () => {
    const onRunClick = vi.fn();
    render(<ExecutionTableView runs={runs} onRunClick={onRunClick} />);

    fireEvent.click(screen.getByText('Alpha'));
    expect(onRunClick).toHaveBeenCalledTimes(1);
    expect(onRunClick.mock.calls[0][0].goal).toBe('Alpha');
  });

  it('row context menu reports to the injected menu builder', async () => {
    const onCancel = vi.fn();
    render(
      <ExecutionTableView
        runs={runs}
        onRunClick={vi.fn()}
        onRowContextMenu={(run) => [
          { id: 'cancel', label: '取消执行', destructive: true, onClick: () => onCancel(run.id) },
        ]}
      />,
    );

    fireEvent.contextMenu(screen.getByText('Alpha').closest('tr') as HTMLElement);
    fireEvent.click(await screen.findByText('取消执行'));

    expect(onCancel).toHaveBeenCalledWith('r1');
  });
});
