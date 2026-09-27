import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, PasswordInput } from './input';

/**
 * D14 测试基线（宪法 §18）。input 引用数 91，P0。
 *
 * 断言范围（§18.2 下限）：受控值 + `onChange` 回调 + 键盘输入 + a11y 标签关联
 * （§8.5 #3 表单控件必须关联 label）。**不断言 className**。
 */
describe('Input 受控与类型契约', () => {
  it('受控值渲染到输入框', () => {
    render(<Input value="工单标题" onChange={() => {}} aria-label="标题" />);

    expect(screen.getByLabelText('标题')).toHaveValue('工单标题');
  });

  it('键盘输入触发 onChange，且 React 受控流可回写新值', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState('');
      return (
        <Input
          aria-label="标题"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setValue(e.target.value);
          }}
        />
      );
    }
    render(<Controlled />);

    const input = screen.getByLabelText('标题');
    await user.type(input, '回归');

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('回归');
    expect(input).toHaveValue('回归');
  });

  it.each(['text', 'number', 'email', 'password', 'search'] as const)(
    'type=%s 透传到原生 input',
    (type) => {
      render(<Input type={type} aria-label={`输入-${type}`} />);

      expect(screen.getByLabelText(`输入-${type}`)).toHaveAttribute('type', type);
    },
  );

  it('disabled 时不可输入（表单禁用态不被绕过）', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input disabled aria-label="标题" onChange={onChange} />);

    const input = screen.getByLabelText('标题');
    expect(input).toBeDisabled();

    await user.type(input, 'x');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('透传占位符与 data-ai-* 标注（§12）', () => {
    render(
      <Input
        placeholder="请输入工单标题"
        aria-label="标题"
        data-ai-component="ui.input"
        data-ai-role="text-input"
      />,
    );

    const input = screen.getByPlaceholderText('请输入工单标题');
    expect(input).toHaveAttribute('data-ai-component', 'ui.input');
    expect(input).toHaveAttribute('data-ai-role', 'text-input');
  });
});

describe('Input 无障碍（§8.5 #3 标签关联 / #5 焦点）', () => {
  it('经 htmlFor 关联的 label 可获得可访问名', () => {
    render(
      <>
        <label htmlFor="issue-title">工单标题</label>
        <Input id="issue-title" />
      </>,
    );

    expect(screen.getByLabelText('工单标题')).toBeInTheDocument();
  });

  it('aria-describedby 关联错误文案（§8.5 #3 错误必须可关联）', () => {
    render(
      <>
        <Input aria-label="标题" aria-invalid="true" aria-describedby="title-error" />
        <p id="title-error">标题不能为空</p>
      </>,
    );

    expect(screen.getByLabelText('标题')).toHaveAccessibleDescription('标题不能为空');
  });

  it('可被 Tab 聚焦（jsdom 可观测的焦点下限；ring 属 CSS 另评）', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="标题" />);

    await user.tab();

    expect(screen.getByLabelText('标题')).toHaveFocus();
  });
});

describe('PasswordInput 显隐切换（含状态逻辑，§18.1 第二条）', () => {
  it('默认 type=password，点击显隐按钮后 type=text，再点击还原', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="密码" />);

    const input = screen.getByLabelText('密码');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button');
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('切换按钮不进入 Tab 序列（tabIndex=-1，属密码框附属装饰）', () => {
    render(<PasswordInput aria-label="密码" />);

    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
  });

  it('默认占位符与调用方占位符都可设置，data-ai-* 默认标注不丢（§12）', () => {
    const { rerender } = render(<PasswordInput aria-label="密码" />);
    expect(screen.getByLabelText('密码')).toHaveAttribute('placeholder', '••••••••');

    rerender(<PasswordInput aria-label="密码" placeholder="留空则不修改" />);
    expect(screen.getByLabelText('密码')).toHaveAttribute('placeholder', '留空则不修改');
    expect(screen.getByLabelText('密码')).toHaveAttribute(
      'data-ai-component',
      'ui.password-input',
    );
  });
});
