import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, type SpinnerSize } from './spinner';

/**
 * D14 测试基线（宪法 §18）。spinner 引用数 56，属 P1「三态核心」。
 *
 * 只测契约不测样式（§18.2）：这里断言的是 **可访问名与语义角色**——
 * loading 指示器对屏幕阅读器唯一可见的出口就是 `role="status"` + `aria-label`
 * （§8.5 #1 图标无文字时必须有可访问名），className/尺寸类一律不断言。
 */
describe('Spinner 状态语义（§8.5 #1 / §18.2 a11y）', () => {
  it('默认暴露 role=status 与中文可访问名「加载中」', () => {
    render(<Spinner />);

    const status = screen.getByRole('status');
    expect(status).toHaveAccessibleName('加载中');
  });

  it('label 覆盖默认可访问名', () => {
    render(<Spinner label="正在加载工单列表" />);

    expect(screen.getByRole('status')).toHaveAccessibleName('正在加载工单列表');
  });

  it('四档 size 均渲染且不改变语义', () => {
    const sizes: SpinnerSize[] = ['sm', 'md', 'lg', 'xl'];

    for (const size of sizes) {
      const { unmount } = render(<Spinner size={size} />);
      expect(screen.getByRole('status')).toHaveAccessibleName('加载中');
      unmount();
    }
  });

  it('透传原生属性（调用方可继续标注自己语义）', () => {
    render(<Spinner data-testid="spin" data-ai-component="ui.spinner" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-testid', 'spin');
    expect(status).toHaveAttribute('data-ai-component', 'ui.spinner');
  });
});
