/**
 * DataTable 键盘流行为测试（P2-06：data-list P1-11 修复平移验证）
 *
 * 与 data-list.test.tsx 同套探针：容器可聚焦、j/k 光标、Enter 打开、
 * x/space 选中、焦点守卫、行点击后焦点回归。jsdom 焦点行为差异的取证口径同彼处。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './data-table';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.defaultValue === 'string' ? opts.defaultValue : key,
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

interface Row {
  id: string;
  title: string;
}

const rows: Row[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma' },
];

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'title', header: 'Title' },
];

function renderTable(overrides?: Partial<Parameters<typeof DataTable<Row>>[0]>) {
  const onRowClick = vi.fn();
  const onSelectedIdsChange = vi.fn();
  const baseProps = {
    columns,
    data: rows,
    getRowId: (row: Row) => row.id,
    onRowClick,
    enableSelection: true,
    selectedIds: [] as string[],
    onSelectedIdsChange,
    ...overrides,
  };
  const utils = render(<DataTable {...baseProps} />);
  return {
    onRowClick,
    onSelectedIdsChange,
    container: utils.container,
    /** 受控环回写：模拟父组件把 onSelectedIdsChange 的结果写回 selectedIds */
    rerenderWithSelection: (selectedIds: string[]) =>
      utils.rerender(<DataTable {...baseProps} selectedIds={selectedIds} />),
  };
}

/** 容器 = 带 aria-label 的表格根（tabIndex=0）；锚定 ^Table 避免 mock 键名 dataTable.* 误匹配 */
const getContainer = () => screen.getByLabelText(/^Table\./);

/** 行内标题文本定位行元素（data-row-id 挂在 tr 上） */
const getRow = (title: string) => screen.getByText(title).closest('tr') as HTMLElement;

/** 活动光标行 token 精确匹配（行 hover 类含子串 bg-accent，不能 toContain） */
const rowHasActive = (title: string) =>
  getRow(title).className.split(/\s+/).includes('bg-accent');

/** jsdom 无 scrollIntoView /（默认无 pretendToBeVisual 时）requestAnimationFrame */
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof requestAnimationFrame;
  }
});

describe('DataTable 键盘流（P2-06 平移 P1-11）', () => {
  it('容器可聚焦：tabIndex=0，focus() 后成为 activeElement', () => {
    renderTable();
    const container = getContainer();
    expect(container.getAttribute('tabindex')).toBe('0');
    container.focus();
    expect(document.activeElement).toBe(container);
  });

  it('容器聚焦后 j/k 移动行光标（tr bg-accent 高亮跟随），Enter 打开当前行', () => {
    const { onRowClick } = renderTable();
    const container = getContainer();
    container.focus();

    fireEvent.keyDown(container, { key: 'j' });
    expect(rowHasActive('Alpha')).toBe(true);
    expect(rowHasActive('Beta')).toBe(false);

    fireEvent.keyDown(container, { key: 'j' });
    expect(rowHasActive('Beta')).toBe(true);
    fireEvent.keyDown(container, { key: 'k' });
    expect(rowHasActive('Alpha')).toBe(true);

    fireEvent.keyDown(container, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('未聚焦容器时按键不触发导航（焦点守卫：只在容器自身聚焦时接管）', () => {
    renderTable();
    fireEvent.keyDown(document.body, { key: 'j' });
    expect(rowHasActive('Alpha')).toBe(false);
  });

  it('容器聚焦时光标行自动落到第一行（onFocus 激活），Tab 进入即可 Enter 打开', () => {
    const { onRowClick } = renderTable();
    const container = getContainer();
    container.focus();
    fireEvent.focusIn(container);
    expect(rowHasActive('Alpha')).toBe(true);
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('点击行后焦点回归表格容器，且光标落到被点击的行', () => {
    renderTable();
    const container = getContainer();
    fireEvent.click(getRow('Beta'));
    // 修复前：点击不可聚焦 tr 焦点留在 body → 键盘流中断
    expect(document.activeElement).toBe(container);
    expect(rowHasActive('Beta')).toBe(true);
  });

  it('x / space 切换当前行选中（走 enableSelection 受控契约），Escape 清空', () => {
    const { onSelectedIdsChange, rerenderWithSelection } = renderTable();
    const container = getContainer();
    container.focus();

    fireEvent.keyDown(container, { key: 'j' });
    fireEvent.keyDown(container, { key: 'x' });
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['a']);
    // 受控环回写后行选中态可见（tr data-state，checkbox 勾选随 selectedIds 联动）
    rerenderWithSelection(['a']);
    expect(getRow('Alpha').getAttribute('data-state')).toBe('selected');

    fireEvent.keyDown(container, { key: ' ' });
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith([]);

    fireEvent.keyDown(container, { key: 'x' });
    fireEvent.keyDown(container, { key: 'j' });
    fireEvent.keyDown(container, { key: 'x' });
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['a', 'b']);

    fireEvent.keyDown(container, { key: 'Escape' });
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith([]);
  });

  it('焦点在行内 checkbox 上时按键交还原生行为：space 走勾选切换，不触发打开', () => {
    const { onRowClick } = renderTable();
    const container = getContainer();
    container.focus();
    fireEvent.keyDown(container, { key: 'j' });

    const checkbox = getRow('Alpha').querySelector(
      '[data-slot="checkbox"]',
    ) as HTMLElement;
    expect(checkbox).toBeTruthy();
    checkbox.focus();
    const openCountBefore = onRowClick.mock.calls.length;
    fireEvent.keyDown(checkbox, { key: ' ' });
    expect(onRowClick.mock.calls.length).toBe(openCountBefore);
  });
});
