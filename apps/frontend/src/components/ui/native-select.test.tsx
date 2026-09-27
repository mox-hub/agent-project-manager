import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/**
 * D14 补缺口（宪法 §18，native-select 引用数 32，P1「表单核心」）。
 *
 * 既有 7 例只覆盖「value → label 显示契约」（都是文本内容断言）。
 * 这里补 §18.2 的另一半：**a11y 标签关联 + 交互回调 + 禁用/必填语义**。
 * 不断言 className（§18.2）。
 */
describe('NativeSelect 无障碍与交互（D14 补缺口）', () => {
  const OPTIONS = (
    <>
      <NativeSelectOption value="p1">项目甲</NativeSelectOption>
      <NativeSelectOption value="p2">项目乙</NativeSelectOption>
    </>
  );

  it('aria-label 成为 combobox 的可访问名（§8.5 #3 控件必须可关联）', () => {
    render(
      <NativeSelect value="p1" onChange={() => {}} aria-label="所属项目">
        {OPTIONS}
      </NativeSelect>,
    );

    expect(screen.getByRole('combobox', { name: '所属项目' })).toBeInTheDocument();
  });

  it('外部 label + id 关联同样获得可访问名（原生 select 的等价写法）', () => {
    render(
      <>
        <label htmlFor="proj">所属项目</label>
        <NativeSelect id="proj" value="p1" onChange={() => {}}>
          {OPTIONS}
        </NativeSelect>
      </>,
    );

    expect(screen.getByLabelText('所属项目')).toBeInTheDocument();
  });

  it('disabled 时控件不可用（表单禁用态不被绕过）', () => {
    render(
      <NativeSelect value="p1" onChange={() => {}} disabled aria-label="所属项目">
        {OPTIONS}
      </NativeSelect>,
    );

    expect(screen.getByRole('combobox', { name: '所属项目' })).toBeDisabled();
  });

  it('required 以 aria-required 暴露给辅助技术（native select 语义等价物）', () => {
    render(
      <NativeSelect value="" onChange={() => {}} required aria-label="所属项目">
        {OPTIONS}
      </NativeSelect>,
    );

    expect(screen.getByRole('combobox', { name: '所属项目' })).toHaveAttribute(
      'aria-required',
      'true',
    );
  });

  it('点击 trigger 打开 listbox 浮层（§8.2 浮层可达）', async () => {
    const user = userEvent.setup();
    render(
      <NativeSelect value="p1" onChange={() => {}} aria-label="所属项目">
        {OPTIONS}
      </NativeSelect>,
    );

    expect(screen.queryByRole('listbox')).toBeNull();

    await user.click(screen.getByRole('combobox', { name: '所属项目' }));

    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('disabled 时点击不打开浮层（禁用不是视觉装饰）', async () => {
    const user = userEvent.setup();
    render(
      <NativeSelect value="p1" onChange={() => {}} disabled aria-label="所属项目">
        {OPTIONS}
      </NativeSelect>,
    );

    await user.click(screen.getByRole('combobox', { name: '所属项目' }));

    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
