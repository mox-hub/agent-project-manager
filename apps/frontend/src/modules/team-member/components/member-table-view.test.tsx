/**
 * MemberTableView 行为级测试（CAP-A-29 / GAP-T-66）
 * 覆盖：行渲染（名称/类型列）/ 行点击 / 管理员右键停用回调。
 * 头像组件依赖真实库（avvvatars/react-nice-avatar），jsdom 可渲染，不整桩。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemberTableView, type MemberTableRow } from './member-table-view';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const buildMember = (overrides: Partial<MemberTableRow>): MemberTableRow =>
  ({
    id: overrides.displayName === 'Alpha' ? 'm1' : 'm2',
    shortId: 'MEM-001',
    type: 'human',
    displayName: overrides.displayName ?? 'member',
    handle: 'handle',
    email: null,
    avatarUrl: null,
    title: null,
    description: null,
    trustLevel: 1,
    status: 'active',
    isOnline: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as MemberTableRow;

const members: MemberTableRow[] = [
  buildMember({ displayName: 'Alpha' }),
  buildMember({ displayName: 'Beta', type: 'ai_agent' }),
];

describe('MemberTableView（CAP-A-29 表格视图）', () => {
  it('renders member rows with name and type columns', () => {
    render(<MemberTableView members={members} onMemberClick={vi.fn()} />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    // 类型列：AI 成员出 'AI' 徽文字、人类成员出人类文案（mock 下 i18n 键或回退文案）
    expect(screen.getByText('AI')).toBeTruthy();
  });

  it('row click reports to onMemberClick', () => {
    const onMemberClick = vi.fn();
    render(<MemberTableView members={members} onMemberClick={onMemberClick} />);

    fireEvent.click(screen.getByText('Alpha'));
    expect(onMemberClick).toHaveBeenCalledTimes(1);
    expect(onMemberClick.mock.calls[0][0].displayName).toBe('Alpha');
  });

  it('admin context menu reports deactivate for active members', async () => {
    const onDeactivate = vi.fn();
    render(
      <MemberTableView
        members={members}
        onMemberClick={vi.fn()}
        isAdmin
        onDeactivate={onDeactivate}
      />,
    );

    fireEvent.contextMenu(screen.getByText('Alpha').closest('tr') as HTMLElement);
    fireEvent.click(await screen.findByText('停用'));

    expect(onDeactivate).toHaveBeenCalledTimes(1);
    expect(onDeactivate.mock.calls[0][0].displayName).toBe('Alpha');
  });
});
