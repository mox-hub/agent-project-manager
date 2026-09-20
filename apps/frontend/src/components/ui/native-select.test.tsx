import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NativeSelect, NativeSelectOption } from './native-select';

/**
 * 回归（2026-09-11）：全站下拉框 trigger 显示的是 value（id）而不是选项名称，
 * 空值状态下还会把内部哨兵 `__native_select_empty__` 当文本渲染出来。
 *
 * 根因：base-ui 的 `Select.Value` 只有在 Root 收到 `items` 时才能把 value 映射成 label，
 * 否则回退 `String(value)`；且弹层关闭时 `SelectItem` 根本不挂载，无法从 item 反推。
 * 修复：`NativeSelect` 把解析出的 `{ value, label }` 作为 `items` 交给 Root。
 */
describe('NativeSelect 显示名称（回归）', () => {
  it('受控值显示选项文本，而非 value（id）', () => {
    render(
      <NativeSelect value="p1" onChange={() => {}}>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
        <NativeSelectOption value="p2">项目乙</NativeSelectOption>
      </NativeSelect>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('项目甲');
    expect(trigger.textContent).not.toContain('p1');
  });

  it('空值且有空选项时显示空选项文本，不泄漏内部哨兵', () => {
    render(
      <NativeSelect value="" onChange={() => {}}>
        <NativeSelectOption value="">全部项目</NativeSelectOption>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
      </NativeSelect>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('全部项目');
    expect(trigger.textContent).not.toContain('__native_select_empty__');
  });

  it('空值但未提供空选项时同样不泄漏哨兵', () => {
    render(
      <NativeSelect value="" onChange={() => {}}>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
      </NativeSelect>,
    );

    expect(screen.getByRole('combobox').textContent).not.toContain('__native_select_empty__');
  });

  it('受控切换值后 trigger 跟随显示新选项名称', () => {
    const { rerender } = render(
      <NativeSelect value="p1" onChange={() => {}}>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
        <NativeSelectOption value="p2">项目乙</NativeSelectOption>
      </NativeSelect>,
    );
    expect(screen.getByRole('combobox').textContent).toContain('项目甲');

    rerender(
      <NativeSelect value="p2" onChange={() => {}}>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
        <NativeSelectOption value="p2">项目乙</NativeSelectOption>
      </NativeSelect>,
    );
    expect(screen.getByRole('combobox').textContent).toContain('项目乙');
  });

  it('非受控时默认选中第一项并显示其名称', () => {
    render(
      <NativeSelect onChange={() => {}}>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
        <NativeSelectOption value="p2">项目乙</NativeSelectOption>
      </NativeSelect>,
    );

    expect(screen.getByRole('combobox').textContent).toContain('项目甲');
  });

  it('optgroup 内的选项同样显示名称', () => {
    render(
      <NativeSelect value="x1" onChange={() => {}}>
        <optgroup label="分组一">
          <NativeSelectOption value="x1">选项一</NativeSelectOption>
        </optgroup>
      </NativeSelect>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('选项一');
    expect(trigger.textContent).not.toContain('x1');
  });

  it('表单集成：隐藏字段回传真实 value，空值时回传空串（哨兵不外泄）', () => {
    const { container, rerender } = render(
      <NativeSelect name="projectId" value="p1" onChange={() => {}}>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
        <NativeSelectOption value="p2">项目乙</NativeSelectOption>
      </NativeSelect>,
    );
    const readHidden = () =>
      (container.querySelector('input[type="hidden"]') as HTMLInputElement).value;

    expect(readHidden()).toBe('p1');

    rerender(
      <NativeSelect name="projectId" value="" onChange={() => {}}>
        <NativeSelectOption value="">全部项目</NativeSelectOption>
        <NativeSelectOption value="p1">项目甲</NativeSelectOption>
      </NativeSelect>,
    );
    expect(readHidden()).toBe('');
  });
});
