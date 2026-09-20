import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSlotSection } from './profile-slot-section';
import type { ProfileAtom, ProfileSlotGroup } from '../../api/profile-api';

/**
 * 槽位区交互：批量接受按钮仅在存在草稿时出现（添加按钮左侧）；
 * 生效卡片提供删除动作（草稿卡走批准/驳回，不显示删除）。
 */

const atom = (overrides: Partial<ProfileAtom> = {}): ProfileAtom => ({
  id: 'a1',
  slot: 'tech-stack',
  type: 'conclusion',
  content: '前端 React 19 + Vite 7',
  confidence: 0.8,
  lifecycle: 'consolidated',
  sourceType: 'manual',
  pinned: false,
  ...overrides,
});

const group = (overrides: Partial<ProfileSlotGroup> = {}): ProfileSlotGroup => ({
  slot: 'tech-stack',
  label: '技术栈',
  description: '项目用了什么',
  filled: true,
  atoms: [],
  drafts: [],
  ...overrides,
});

const setup = (overrides: Partial<ProfileSlotGroup> = {}) => {
  const onApproveAll = vi.fn();
  const onDelete = vi.fn();
  render(
    <ProfileSlotSection
      group={group(overrides)}
      projectId="p1"
      onEdit={vi.fn()}
      onApprove={vi.fn()}
      onReject={vi.fn()}
      onAdd={vi.fn()}
      onApproveAll={onApproveAll}
      onDelete={onDelete}
    />,
  );
  return { onApproveAll, onDelete };
};

describe('ProfileSlotSection 批量接受', () => {
  it('存在草稿时在添加按钮左侧显示批量接受，点击携带全部草稿 id', async () => {
    const { onApproveAll } = setup({
      drafts: [atom({ id: 'd1', lifecycle: 'working' }), atom({ id: 'd2', lifecycle: 'working' })],
    });

    const batch = screen.getByRole('button', { name: /Accept all \(2\)/ });
    // DOM 顺序断言：批量接受在添加按钮之前（渲染于其左侧）
    const add = screen.getByRole('button', { name: 'Add' });
    expect(batch.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(batch);
    expect(onApproveAll).toHaveBeenCalledWith(['d1', 'd2']);
  });

  it('无草稿时不渲染批量接受按钮', () => {
    setup({ atoms: [atom()] });
    expect(screen.queryByRole('button', { name: /Accept all/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });
});

describe('ProfileAtomCard 删除', () => {
  it('生效卡片悬停动作含删除，点击回传 atom id', async () => {
    const { onDelete } = setup({ atoms: [atom({ id: 'c1' })] });
    const del = screen.getByTitle('Delete');
    await userEvent.click(del);
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('草稿卡不显示删除按钮（走批准/驳回）', () => {
    setup({ drafts: [atom({ id: 'd1', lifecycle: 'working' })] });
    expect(screen.queryByTitle('Delete')).toBeNull();
    expect(screen.getByRole('button', { name: /Approve/ })).toBeTruthy();
  });
});
