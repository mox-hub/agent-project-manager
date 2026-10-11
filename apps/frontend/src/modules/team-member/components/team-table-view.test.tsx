/**
 * TeamTableView 行为级测试（CAP-A-29 / GAP-T-66）
 * 覆盖：行渲染（名称/计数列）/ 行点击 / 右键归档回调 / 空态。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamTableView, type TeamTableRow } from './team-table-view';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const buildTeam = (overrides: Partial<TeamTableRow>): TeamTableRow =>
  ({
    id: overrides.name === 'Alpha' ? 'tm1' : 'tm2',
    name: overrides.name ?? 'team',
    slug: 'team-slug',
    description: null,
    avatarUrl: null,
    color: null,
    status: 'active',
    memberCount: 3,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    _count: { members: 3, projects: 2 },
    ...overrides,
  }) as TeamTableRow;

const teams: TeamTableRow[] = [
  buildTeam({ name: 'Alpha' }),
  buildTeam({ name: 'Beta', status: 'archived' }),
];

describe('TeamTableView（CAP-A-29 表格视图）', () => {
  it('renders team rows with counts and archived badge', () => {
    render(<TeamTableView teams={teams} onTeamClick={vi.fn()} />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getAllByText('@team-slug').length).toBe(2);
    // Beta 已归档 → 归档徽标（mock t 返回回退文案）
    expect(screen.getByText('已归档')).toBeTruthy();
  });

  it('row click reports to onTeamClick', () => {
    const onTeamClick = vi.fn();
    render(<TeamTableView teams={teams} onTeamClick={onTeamClick} />);

    fireEvent.click(screen.getByText('Alpha'));
    expect(onTeamClick).toHaveBeenCalledTimes(1);
    expect(onTeamClick.mock.calls[0][0].name).toBe('Alpha');
  });

  it('context menu archive reports to onArchive for active teams', async () => {
    const onArchive = vi.fn();
    render(<TeamTableView teams={teams} onTeamClick={vi.fn()} onArchive={onArchive} />);

    fireEvent.contextMenu(screen.getByText('Alpha').closest('tr') as HTMLElement);
    fireEvent.click(await screen.findByText('归档'));

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onArchive.mock.calls[0][0].name).toBe('Alpha');
  });

  it('renders the empty content when no teams', () => {
    render(<TeamTableView teams={[]} onTeamClick={vi.fn()} />);
    expect(screen.getByText('暂无团队')).toBeTruthy();
  });
});
