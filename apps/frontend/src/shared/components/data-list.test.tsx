/**
 * DataList 键盘流行为测试（P1-11 复核 + 修复验证）
 *
 * 复核背景：实测报告「键盘流半残——需手动聚焦、点击行后焦点即丢、无可见提示、x/space 多选不存在」。
 * jsdom 焦点行为与真实浏览器有差异（jsdom 的 fireEvent.click 不会自动转移焦点，
 * 真实浏览器点击不可聚焦 div 会把焦点丢回 body），因此每个结论都以
 * 「测试结果 + 代码逻辑」双重证据呈现，见各组注释。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DataList, type DataListItem } from './data-list';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

interface Item extends DataListItem {
  id: string;
  title: string;
}

const items: Item[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma' },
];

function renderList(overrides?: Partial<Parameters<typeof DataList<Item>>[0]>) {
  const onItemClick = vi.fn();
  const onSelectionChange = vi.fn();
  const utils = render(
    <DataList
      items={items}
      selectable
      onItemClick={onItemClick}
      onSelectionChange={onSelectionChange}
      renderLeading={(item) => <span>{item.title}</span>}
      {...overrides}
    />,
  );
  return { onItemClick, onSelectionChange, container: utils.container };
}

/** 容器 = 带 aria-label 的列表根（tabIndex=0） */
const getContainer = () => screen.getByLabelText(/List\./);

/** 行内标题文本定位行元素（data-row-id 挂在行 content div 上） */
const getRow = (title: string) => screen.getByText(title).closest('[data-row-id]') as HTMLElement;

/** 活动光标行 token 精确匹配（行 hover 类 hover:bg-accent/20 含子串 bg-accent，不能 toContain） */
const rowHasActive = (title: string) => getRow(title).className.split(/\s+/).includes('bg-accent');

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

describe('DataList 键盘流（P1-11）', () => {
  it('容器可聚焦：tabIndex=0，focus() 后成为 activeElement', () => {
    renderList();
    const container = getContainer();
    expect(container.getAttribute('tabindex')).toBe('0');
    container.focus();
    expect(document.activeElement).toBe(container);
  });

  it('容器聚焦后 j/k 移动行光标（bg-accent 高亮跟随），Enter 打开当前行', () => {
    const { onItemClick } = renderList();
    const container = getContainer();
    container.focus();

    // j：光标落到第一行
    fireEvent.keyDown(container, { key: 'j' });
    expect(rowHasActive('Alpha')).toBe(true);
    expect(rowHasActive('Beta')).toBe(false);

    // j：前进到第二行；k：退回第一行
    fireEvent.keyDown(container, { key: 'j' });
    expect(rowHasActive('Beta')).toBe(true);
    fireEvent.keyDown(container, { key: 'k' });
    expect(rowHasActive('Alpha')).toBe(true);

    // Enter：打开当前光标行
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
  });

  it('未聚焦容器时按键不触发导航（焦点守卫：只在容器自身聚焦时接管）', () => {
    renderList();
    // 事件派发到 body（模拟「点击行后焦点即丢、按键无响应」场景）
    fireEvent.keyDown(document.body, { key: 'j' });
    expect(rowHasActive('Alpha')).toBe(false);
  });

  it('容器聚焦时光标行自动落到第一行（onFocus 激活），Tab 进入即可 Enter 打开', () => {
    const { onItemClick } = renderList();
    const container = getContainer();
    container.focus();
    // jsdom 的 focus() 不派发 focusin（React onFocus 的委托事件），用 focusIn 模拟真实浏览器行为
    fireEvent.focusIn(container);
    expect(rowHasActive('Alpha')).toBe(true);
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
  });

  it('点击行后焦点回归列表容器，且光标落到被点击的行', () => {
    renderList();
    const container = getContainer();
    fireEvent.click(getRow('Beta'));
    // 修复前：点击行（不可聚焦 div）焦点留在 body → 键盘流中断（真实浏览器同此行为）
    expect(document.activeElement).toBe(container);
    expect(rowHasActive('Beta')).toBe(true);
  });

  it('x / space 切换当前行选中（接 selectable 多选契约），Escape 清空', () => {
    const { onSelectionChange } = renderList();
    const container = getContainer();
    container.focus();

    fireEvent.keyDown(container, { key: 'j' });
    fireEvent.keyDown(container, { key: 'x' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['a']));
    // 多选框进入选中态
    expect(getRow('Alpha').querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('true');

    // space 同样是切换选中
    fireEvent.keyDown(container, { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());

    // x 选中后再加 j、x → 多行
    fireEvent.keyDown(container, { key: 'x' });
    fireEvent.keyDown(container, { key: 'j' });
    fireEvent.keyDown(container, { key: 'x' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['a', 'b']));

    fireEvent.keyDown(container, { key: 'Escape' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());
  });

  it('焦点在行内按钮（checkbox）上时按键交还原生行为：space 走按钮点击切换，不触发打开', () => {
    const { onItemClick } = renderList();
    const container = getContainer();
    container.focus();
    fireEvent.keyDown(container, { key: 'j' });

    const checkbox = getRow('Alpha').querySelector('[role="checkbox"]') as HTMLElement;
    checkbox.focus();
    const openCountBefore = onItemClick.mock.calls.length;
    fireEvent.keyDown(checkbox, { key: ' ' });
    expect(onItemClick.mock.calls.length).toBe(openCountBefore);
  });
});
