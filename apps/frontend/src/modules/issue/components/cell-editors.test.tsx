/**
 * 列表行属性就地编辑（CAP-A-08）：点击行内状态/优先级/负责人单元格 → 下拉 →
 * 点选即调对应 mutation（与右键菜单同源链路）。
 */
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskSimpleList } from './task-simple-list';
import type { Task } from '../api/issue-api';

const updateMutate = vi.fn();
const assignMutate = vi.fn();

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('../hooks/use-project-tasks', () => ({
  useUpdateTask: () => ({ mutate: updateMutate }),
  useProjectMilestones: () => ({ data: [] }),
}));

vi.mock('../hooks/use-assignee-sync', () => ({
  useAssignPrimaryMember: () => ({ mutate: assignMutate }),
}));

vi.mock('@/modules/team-member/hooks', () => ({
  useMembers: () => ({
    data: {
      items: [
        { id: 'm1', userId: 'u1', displayName: '张三', handle: 'zhang' },
        { id: 'm2', userId: 'u2', displayName: '李四', handle: 'li' },
      ],
    },
  }),
}));

vi.mock('../hooks/use-issue-types', () => ({
  useIssueTypes: () => ({ types: [], byId: new Map(), byKey: new Map() }),
  useIssueTypeOf: () => () => undefined,
}));

vi.mock('@/shared/context-menu/use-issue-row-menu', () => ({
  useIssueRowMenu: () => () => undefined,
}));

const task: Task = {
  id: 't1',
  title: '示例任务',
  status: 'todo',
  priority: 'medium',
  type: 'task',
} as Task;

function renderList() {
  return render(<TaskSimpleList tasks={[task]} onTaskClick={vi.fn()} />);
}

beforeAll(() => {
  Element.prototype.getAnimations = vi.fn(() => []) as never;
  if (!globalThis.PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
      }
    }
    (globalThis as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
  }
});

describe('列表行属性下拉即时修改', () => {
  it('点击状态图标弹下拉，点选 Done 即调 useUpdateTask', async () => {
    renderList();
    fireEvent.click(screen.getByTitle('状态'));
    const done = await screen.findByText('Done');
    fireEvent.click(done);
    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith({ issueId: 't1', data: { status: 'done' } });
    });
  });

  it('点击优先级图标弹下拉，点选 High 即调 useUpdateTask', async () => {
    renderList();
    fireEvent.click(screen.getByTitle('优先级'));
    const high = await screen.findByText('High');
    fireEvent.click(high);
    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith({ issueId: 't1', data: { priority: 'high' } });
    });
  });

  it('点击负责人头像弹下拉，点选成员即调 useAssignPrimaryMember（Member 口径）', async () => {
    renderList();
    fireEvent.click(screen.getByTitle('负责人'));
    const member = await screen.findByText('张三');
    fireEvent.click(member);
    await waitFor(() => {
      expect(assignMutate).toHaveBeenCalledWith({ issueId: 't1', memberId: 'm1' });
    });
  });

  it('点击行内单元格不冒泡触发行点击（不打开详情）', async () => {
    const onTaskClick = vi.fn();
    render(<TaskSimpleList tasks={[task]} onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getByTitle('状态'));
    await screen.findByText('Done');
    expect(onTaskClick).not.toHaveBeenCalled();
  });
});
