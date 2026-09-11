import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

/**
 * `Select` 的 label 显示契约（2026-09-11 定案）。
 *
 * base-ui 的 `Select.Value` 只有在 **Root 收到 `items`** 时才能把 value 映射成 label，
 * 否则回退 `String(value)`——trigger 就会显示原始 value（也就是 id）。
 * `SelectItem` 里的文本帮不上忙：弹层关闭时 item 根本没挂载，无法反推。
 *
 * 所以新写下拉框时的硬规则：**value ≠ 展示文本** 时，必须给 `Select` 传 `items`
 * （或给 `SelectValue` 传函数式 children），否则显示的就是 id。
 * 用 `NativeSelect` 则无需关心——它已从组件层把 `items` 接好。
 */
describe('Select 的 items → label 映射契约', () => {
  const ITEMS = [
    { value: 'p1', label: '项目甲' },
    { value: 'p2', label: '项目乙' },
  ];

  it('传 items 后 trigger 显示 label 而非 value', () => {
    render(
      <Select value="p1" items={ITEMS}>
        <SelectTrigger>
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          {ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('项目甲');
    expect(trigger.textContent).not.toContain('p1');
  });

  it('items 以 Record 形式给出同样生效', () => {
    render(
      <Select value="a" items={{ a: 'Option Alpha', b: 'Option Beta' }}>
        <SelectTrigger>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option Alpha</SelectItem>
          <SelectItem value="b">Option Beta</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByRole('combobox').textContent).toContain('Option Alpha');
  });

  it('显式 children 优先于 items（老用法保持可用）', () => {
    render(
      <Select value="p1" items={ITEMS}>
        <SelectTrigger>
          <SelectValue>自定义展示名</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('自定义展示名');
    expect(trigger.textContent).not.toContain('项目甲');
  });
});
