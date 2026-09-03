import { act, renderHook, render, screen, fireEvent } from '@testing-library/react';
import { RefreshCw } from 'lucide-react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ToolbarRow,
  useToolbarViews,
  type ToolbarMenuSlot,
  type ToolbarViewEntry,
} from './toolbar-row';

// setup.ts 将 localStorage mock 为无实现的 vi.fn()，这里接上内存实现
const memoryStorage = new Map<string, string>();
beforeAll(() => {
  vi.mocked(localStorage.getItem).mockImplementation((k) => memoryStorage.get(k) ?? null);
  vi.mocked(localStorage.setItem).mockImplementation((k, v) => void memoryStorage.set(k, v));
  vi.mocked(localStorage.removeItem).mockImplementation((k) => void memoryStorage.delete(k));
  vi.mocked(localStorage.clear).mockImplementation(() => void memoryStorage.clear());
});

const baseProps = {
  views: [
    { id: 'all', name: 'All', icon: 'list', builtIn: true, snapshot: { status: 'all' } },
    { id: 'mine', name: 'Mine', icon: 'star', snapshot: { status: 'done' } },
  ] satisfies ToolbarViewEntry[],
  activeViewId: 'all',
  onSelectView: vi.fn(),
  onCreateView: vi.fn(),
  onUpdateView: vi.fn(),
  onDeleteView: vi.fn(),
};

function renderToolbar(overrides?: {
  filterMenu?: ToolbarMenuSlot | false;
  displayMenu?: ToolbarMenuSlot | false;
  downloadMenu?: ToolbarMenuSlot | false;
}) {
  return render(
    <ToolbarRow
      {...baseProps}
      filterMenu={{ items: [{ type: 'checkbox', label: 'Done', checked: true, onSelect: vi.fn() }] }}
      displayMenu={{ items: [{ type: 'label', label: 'Group by' }, { type: 'separator' }] }}
      downloadMenu={{ items: [{ type: 'item', label: 'CSV' }] }}
      {...overrides}
    />,
  );
}

describe('ToolbarRow', () => {
  it('渲染视图胶囊、加号与默认三按钮', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Display' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('点击非激活视图胶囊触发 onSelectView', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Mine' }));
    expect(baseProps.onSelectView).toHaveBeenCalledWith('mine');
  });

  it('filterMenu 传 false 时移除筛选按钮', () => {
    renderToolbar({ filterMenu: false });
    expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Display' })).toBeInTheDocument();
  });

  it('视图样式 ≤3 种时居中渲染 SegmentedControl', () => {
    renderToolbar();
    // baseProps 未传 viewStyle，补充一版
    render(
      <ToolbarRow
        {...baseProps}
        viewStyle={{
          value: 'list',
          onChange: vi.fn(),
          options: [
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
          ],
        }}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'List' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Board' }).length).toBeGreaterThan(0);
  });

  it('视图样式 >3 种时收进右侧常驻下拉按钮', () => {
    render(
      <ToolbarRow
        {...baseProps}
        viewStyle={{
          value: 'list',
          onChange: vi.fn(),
          options: [
            { value: 'list', label: 'ListView' },
            { value: 'board', label: 'BoardView' },
            { value: 'gantt', label: 'GanttView' },
            { value: 'swimlane', label: 'SwimlaneView' },
          ],
        }}
      />,
    );
    // 常驻按钮显示当前样式 label
    expect(screen.getByRole('button', { name: 'ListView' })).toBeInTheDocument();
    // SegmentedControl 形态不再渲染其余样式按钮
    expect(screen.queryByRole('button', { name: 'BoardView' })).not.toBeInTheDocument();
  });

  it('extraActions 渲染页面注册按钮', () => {
    render(
      <ToolbarRow
        {...baseProps}
        filterMenu={false}
        displayMenu={false}
        downloadMenu={false}
        extraActions={[
          { id: 'refresh', label: 'Refresh', icon: RefreshCw, onClick: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});

describe('useToolbarViews', () => {
  const defaults: ToolbarViewEntry[] = [
    { id: 'default', name: 'Default', builtIn: true, snapshot: { status: 'all', viewStyle: 'list' } },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('本地无存储时回退默认视图（至少一个）', () => {
    const { result } = renderHook(() => useToolbarViews({ key: 'test-a', defaults }));
    expect(result.current.views).toEqual(defaults);
    expect(result.current.activeViewId).toBe('default');
  });

  it('损坏的存储回退默认视图', () => {
    localStorage.setItem('toolbar-views:test-b', '{broken json');
    const { result } = renderHook(() => useToolbarViews({ key: 'test-b', defaults }));
    expect(result.current.views).toEqual(defaults);
  });

  it('key 变化时重载目标 key 的视图且不跨 key 写入', () => {
    const storedA: ToolbarViewEntry[] = [
      { id: 'a1', name: 'A1', builtIn: true, snapshot: { s: 1 } },
    ];
    const storedB: ToolbarViewEntry[] = [
      { id: 'b1', name: 'B1', builtIn: true, snapshot: { s: 2 } },
      { id: 'b2', name: 'B2', snapshot: { s: 3 } },
    ];
    localStorage.setItem('toolbar-views:test-g', JSON.stringify(storedA));
    localStorage.setItem('toolbar-views:test-h', JSON.stringify(storedB));
    const { result, rerender } = renderHook(
      ({ key }) => useToolbarViews({ key, defaults }),
      { initialProps: { key: 'test-g' } },
    );
    expect(result.current.views.map((v) => v.id)).toEqual(['a1']);

    rerender({ key: 'test-h' });
    expect(result.current.views.map((v) => v.id)).toEqual(['b1', 'b2']);
    expect(result.current.activeViewId).toBe('b1');
    expect(JSON.parse(localStorage.getItem('toolbar-views:test-g') ?? '[]')).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('toolbar-views:test-h') ?? '[]')).toHaveLength(2);
  });

  it('createView 以当前快照新建并激活，且持久化', () => {
    const { result } = renderHook(() => useToolbarViews({ key: 'test-c', defaults }));
    act(() => result.current.updateActiveSnapshot({ status: 'done', viewStyle: 'board' }));
    act(() => result.current.createView('My View', 'flag'));
    expect(result.current.views).toHaveLength(2);
    expect(result.current.activeViewId).not.toBe('default');
    const created = result.current.views.find((v) => v.name === 'My View');
    expect(created?.snapshot).toEqual({ status: 'done', viewStyle: 'board' });
    expect(JSON.parse(localStorage.getItem('toolbar-views:test-c') ?? '[]')).toHaveLength(2);
  });

  it('selectView 触发 onApply 恢复快照', () => {
    const onApply = vi.fn();
    const stored: ToolbarViewEntry[] = [
      { id: 'a', name: 'A', builtIn: true, snapshot: { s: 1 } },
      { id: 'b', name: 'B', snapshot: { s: 2 } },
    ];
    localStorage.setItem('toolbar-views:test-d', JSON.stringify(stored));
    const { result } = renderHook(() => useToolbarViews({ key: 'test-d', defaults, onApply }));
    act(() => result.current.selectView('b'));
    expect(result.current.activeViewId).toBe('b');
    expect(onApply).toHaveBeenCalledWith({ s: 2 });
  });

  it('updateActiveSnapshot 相同数据不触发更新', () => {
    const { result } = renderHook(() => useToolbarViews({ key: 'test-e', defaults }));
    act(() => result.current.updateActiveSnapshot({ status: 'all', viewStyle: 'list' }));
    const before = result.current.views;
    act(() => result.current.updateActiveSnapshot({ status: 'all', viewStyle: 'list' }));
    expect(result.current.views).toBe(before);
  });

  it('builtIn 与最后一个视图不可删除；删除激活视图回退首个', () => {
    const onApply = vi.fn();
    const stored: ToolbarViewEntry[] = [
      { id: 'a', name: 'A', builtIn: true, snapshot: { s: 1 } },
      { id: 'b', name: 'B', snapshot: { s: 2 } },
      { id: 'c', name: 'C', snapshot: { s: 3 } },
    ];
    localStorage.setItem('toolbar-views:test-f', JSON.stringify(stored));
    const { result } = renderHook(() => useToolbarViews({ key: 'test-f', defaults, onApply }));

    act(() => result.current.deleteView('a'));
    expect(result.current.views).toHaveLength(3);

    act(() => result.current.selectView('c'));
    act(() => result.current.deleteView('c'));
    expect(result.current.views.map((v) => v.id)).toEqual(['a', 'b']);
    expect(result.current.activeViewId).toBe('a');
    expect(onApply).toHaveBeenCalledWith({ s: 1 });

    act(() => result.current.deleteView('a'));
    act(() => result.current.deleteView('b'));
    expect(result.current.views).toHaveLength(1);
  });
});
