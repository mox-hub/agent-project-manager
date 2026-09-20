import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskTableView } from './task-table-view';
import type { Task } from '../api/issue-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('../hooks/use-issue-types', () => ({
  useIssueTypes: () => ({ types: [], byId: new Map(), byKey: new Map() }),
  useIssueTypeOf: () => () => undefined,
}));

const buildTask = (overrides: Partial<Task>): Task =>
  ({
    id: overrides.title === 'Alpha' ? 't1' : 't2',
    title: overrides.title ?? 'task',
    status: 'todo',
    priority: 'medium',
    projectId: 'p1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  }) as Task;

const tasks: Task[] = [
  buildTask({ title: 'Alpha', priority: 'high' }),
  buildTask({ title: 'Beta', priority: 'low' }),
];

describe('TaskTableView（P1-14 表格排序与列显隐）', () => {
  it('reports header sort clicks to the page-level onSortChange callback', () => {
    const onSortChange = vi.fn();
    render(
      <TaskTableView
        tasks={tasks}
        sorting={{ orderBy: 'priority', orderDirection: 'desc' }}
        onSortChange={onSortChange}
      />,
    );

    // 此前列只有 id 无 accessorFn → getCanSort 恒 false → 表头是死开关；现在点击上报排序
    fireEvent.click(screen.getByRole('button', { name: /Status/ }));

    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onSortChange).toHaveBeenCalledWith('status', 'asc');
  });

  it('reorders rows according to the controlled sorting prop (desc by priority rank)', () => {
    render(
      <TaskTableView tasks={tasks} sorting={{ orderBy: 'priority', orderDirection: 'desc' }} />,
    );

    const titles = screen
      .getAllByText(/Alpha|Beta/)
      .map((el) => el.textContent);
    expect(titles[0]).toBe('Alpha');
  });

  it('hides columns toggled off by displayProperties and keeps the rest', () => {
    render(<TaskTableView tasks={tasks} displayProperties={{ status: false, aiExecution: false }} />);

    expect(screen.queryByText('Status')).toBeNull();
    expect(screen.queryByText('AI 接管状态')).toBeNull();
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Priority')).toBeTruthy();
  });

  it('shows every property column by default when displayProperties is omitted', () => {
    render(<TaskTableView tasks={tasks} />);

    for (const header of ['ID', 'Title', 'AI 接管状态', 'Status', 'Priority', 'Assignee', 'Project', 'Estimate', 'Due Date', 'Labels', 'Created', 'Updated']) {
      expect(screen.getByText(header)).toBeTruthy();
    }
  });
});

describe('TaskTableView 子任务缩进与折叠（P1-17）', () => {
  const parent = buildTask({ title: 'Parent', id: 'p1', priority: 'high' });
  const child = buildTask({ title: 'Child', id: 'c1', parentIssueId: 'p1', priority: 'low' });
  const standalone = buildTask({ title: 'Standalone', id: 's1', priority: 'low' });

  it('子任务行按 parentIssueId 跟随父行缩进展示（父行后紧跟子行）', () => {
    render(<TaskTableView tasks={[parent, child, standalone]} />);

    // 渲染顺序：父行 → 子行 → 独立任务（树化平铺）
    const titles = screen.getAllByText(/Parent|Child|Standalone/).map((el) => el.textContent);
    expect(titles).toEqual(['Parent', 'Child', 'Standalone']);

    // 子行 title 有缩进（depth=1 → paddingLeft 16px），父行/独立任务无缩进
    const childCell = screen.getByText('Child').closest('[data-subtask-depth]') as HTMLElement;
    expect(childCell.dataset.subtaskDepth).toBe('1');
    expect(childCell.style.paddingLeft).toBe('16px');
    const parentCell = screen.getByText('Parent').closest('[data-subtask-depth]') as HTMLElement;
    expect(parentCell.dataset.subtaskDepth).toBe('0');
    expect(parentCell.style.paddingLeft).toBe('');
  });

  it('父行折叠 chevron 收起子任务，再展开恢复', () => {
    render(<TaskTableView tasks={[parent, child]} />);

    expect(screen.getByRole('button', { name: 'Collapse Parent' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Parent' }));
    expect(screen.queryByText('Child')).toBeNull();
    // 折叠引发列定义重建 → 表格重渲染，需重新查询按钮引用
    expect(
      screen.getByRole('button', { name: 'Expand Parent' }).getAttribute('aria-expanded'),
    ).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Expand Parent' }));
    expect(screen.getByText('Child')).toBeTruthy();
  });

  it('无子任务的父行不渲染折叠 chevron（仅占位对齐）', () => {
    render(<TaskTableView tasks={[standalone]} />);
    expect(screen.queryByRole('button', { name: /Collapse|Expand/ })).toBeNull();
  });

  it('孤儿子任务（父不在当前列表）按普通行展示，不缩进', () => {
    const orphan = buildTask({ title: 'Orphan', id: 'o1', parentIssueId: 'ghost-parent' });
    render(<TaskTableView tasks={[orphan]} />);
    const cell = screen.getByText('Orphan').closest('[data-subtask-depth]') as HTMLElement;
    expect(cell.dataset.subtaskDepth).toBe('0');
  });

  it('排序回声：客户端排序下子行取父行排序值，紧贴父行不被甩出相邻位', () => {
    // priority desc：Parent(high) → Child 回声 high（自身 low），Standalone(low)
    // 若无回声，Child(low) 会被排到 Standalone 旁而脱离父行
    render(
      <TaskTableView tasks={[parent, child, standalone]} sorting={{ orderBy: 'priority', orderDirection: 'desc' }} />,
    );
    const titles = screen.getAllByText(/Parent|Child|Standalone/).map((el) => el.textContent);
    expect(titles).toEqual(['Parent', 'Child', 'Standalone']);
  });
});
