import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GripVertical } from 'lucide-react';
import { Sortable, SortableItem, SortableItemHandle } from './sortable';

const FRUITS = ['apple', 'banana', 'cherry'];

function listTree(value: string[] = FRUITS) {
  return (
    <Sortable value={value} onValueChange={() => {}} getItemValue={(x) => x}>
      {value.map((f) => (
        <SortableItem key={f} value={f}>
          <SortableItemHandle render={<button type="button" aria-label={`拖拽 ${f}`} />}>
            <GripVertical className="size-3.5" />
          </SortableItemHandle>
          <span>{f}</span>
        </SortableItem>
      ))}
    </Sortable>
  );
}

function itemValues() {
  return Array.from(document.querySelectorAll('[data-slot="sortable-item"]')).map((el) =>
    el.getAttribute('data-value'),
  );
}

describe('Sortable（reui base-nova 移植）', () => {
  it('渲染全部条目，把手默认 cursor-grab（拖拽时切 grabbing）', () => {
    render(listTree());
    FRUITS.forEach((f) => expect(screen.getByText(f)).toBeInTheDocument());
    const handle = screen.getByRole('button', { name: '拖拽 apple' });
    expect(handle.className).toContain('cursor-grab');
    expect(handle.closest('[data-slot="sortable-item-handle"]')).not.toBeNull();
  });

  it('受控 value 重排后 DOM 顺序跟随（持久化缝 = onValueChange 的全量数组）', () => {
    const { rerender } = render(listTree());
    expect(itemValues()).toEqual(FRUITS);
    const reversed = [...FRUITS].reverse();
    rerender(listTree(reversed));
    expect(itemValues()).toEqual(reversed);
  });

  it('禁用条目带 data-disabled 标记', () => {
    render(
      <Sortable value={['a', 'b']} onValueChange={() => {}} getItemValue={(x) => x}>
        <SortableItem value="a">A</SortableItem>
        <SortableItem value="b" disabled>B</SortableItem>
      </Sortable>,
    );
    const itemB = document.querySelector('[data-slot="sortable-item"][data-value="b"]');
    expect(itemB).toHaveAttribute('data-disabled');
    expect(itemB?.className).toContain('opacity-50');
  });

  it('重复条目 id 在开发态触发告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Sortable value={['a', 'a']} onValueChange={() => {}} getItemValue={(x) => x}>
        <SortableItem value="a">A1</SortableItem>
        <SortableItem value="a">A2</SortableItem>
      </Sortable>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate item id "a"'));
    warn.mockRestore();
  });
});
