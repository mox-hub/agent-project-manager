import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from './status-pill';

/**
 * D14 测试基线（宪法 §18）。status-pill 引用数 35，P1。
 *
 * ⚠️ 该组件是**纯展示 span**：无 role、无 aria、无回调、无状态。
 * 组件文件里 5 个 tone 的差异**全部实现在 className 上**，而 §18.2 明令禁止
 * className 断言——因此本文件只测一件真正有语义的事：
 * **状态必须以文本形式存在**（§8.5 #4「不得只靠颜色传达状态」），
 * 即 5 个 tone 下文本都进入可访问文本流，屏幕阅读器读得到。
 * tone → 配色的映射不做断言，交人工评审/视觉回归（见报告「存疑清单」）。
 */
const TONES = ['default', 'success', 'warning', 'danger', 'info'] as const;

describe('StatusPill 状态文本可见性（§8.5 #4）', () => {
  it.each(TONES)('tone=%s 时状态文本进入可访问文本流（不靠颜色单独传达）', (tone) => {
    const label = `状态-${tone}`;
    const { container } = render(<StatusPill tone={tone}>{label}</StatusPill>);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.textContent).toContain(label);
  });

  it('默认 tone 不传时文本照常渲染（默认档可用）', () => {
    render(<StatusPill>进行中</StatusPill>);

    expect(screen.getByText('进行中')).toBeInTheDocument();
  });

  it('渲染为行内 span，不冒领交互语义（无 button/link role，§8.5 #7）', () => {
    render(<StatusPill tone="success">通过</StatusPill>);

    const pill = screen.getByText('通过');
    expect(pill.closest('span')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('支持非文本 children（数字计数）并可被读取', () => {
    render(<StatusPill tone="warning">{3}</StatusPill>);

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
