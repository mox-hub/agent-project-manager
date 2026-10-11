/**
 * ReleaseTableView 行为级测试（CAP-A-29 扩展切片 / GAP-T-66）
 * 覆盖：行渲染（版本/通道/名称/项目）/ 行级卡点徽标（批四投影）/ 行点击进详情。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReleaseTableView } from './release-table-view';
import type { ReleaseRecord } from '../api/release-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: string | { defaultValue?: string } & Record<string, unknown>) => {
      const vars = typeof options === 'object' && options ? options : null;
      if (typeof options === 'string') return options;
      let text = vars?.defaultValue ?? key;
      if (vars) text = String(text).replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ''));
      return text;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const buildRelease = (overrides: Partial<ReleaseRecord>): ReleaseRecord =>
  ({
    id: overrides.version === '1.0.0' ? 'rel1' : 'rel2',
    projectId: 'p1',
    version: overrides.version ?? '1.1.0',
    name: overrides.name ?? '发版一',
    status: 'released',
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    tagPushed: true,
    githubReleased: true,
    project: { id: 'p1', name: '项目一' },
    ...overrides,
  }) as ReleaseRecord;

const releases: ReleaseRecord[] = [
  buildRelease({ version: '1.0.0', name: '首发版', status: 'released', releasedAt: '2026-01-05T00:00:00Z' }),
  buildRelease({ version: '2.0.0-beta.1', name: '二〇大版本', status: 'gated', hasPendingApproval: true, plannedAt: '2026-02-01T00:00:00Z' }),
];

describe('ReleaseTableView（CAP-A-29 扩展切片）', () => {
  it('renders release rows with version, name and project columns', () => {
    render(<ReleaseTableView releases={releases} onReleaseClick={vi.fn()} />);

    expect(screen.getByText('v1.0.0')).toBeTruthy();
    expect(screen.getByText('首发版')).toBeTruthy();
    expect(screen.getAllByText('项目一').length).toBe(2);
  });

  it('renders pending-approval blockage chip for gated releases', () => {
    render(<ReleaseTableView releases={releases} onReleaseClick={vi.fn()} />);

    expect(screen.getByText('release.list.pendingApproval')).toBeTruthy();
  });

  it('row click reports to onReleaseClick', () => {
    const onReleaseClick = vi.fn();
    render(<ReleaseTableView releases={releases} onReleaseClick={onReleaseClick} />);

    fireEvent.click(screen.getByText('首发版'));
    expect(onReleaseClick).toHaveBeenCalledTimes(1);
    expect(onReleaseClick.mock.calls[0][0].version).toBe('1.0.0');
  });
});
