import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Inbox } from 'lucide-react';
import { IconStack } from './icon-stack';

describe('IconStack（reui base-nova 移植）', () => {
  it('渲染三层层叠与 children 居中内容，透传 aria-hidden', () => {
    const { container } = render(
      <IconStack aria-hidden="true">
        <Inbox data-testid="stack-icon" />
      </IconStack>,
    );
    // 3 层卡堆 × 每层双 path（左右侧面）= 6 个 layer path
    expect(container.querySelectorAll('[data-slot="icon-stack-layer"]')).toHaveLength(6);
    expect(screen.getByTestId('stack-icon')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="icon-stack"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    // SVG 本体始终对辅助技术隐藏（装饰性）
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('无 children 时不渲染内容槽', () => {
    const { container } = render(<IconStack />);
    expect(container.querySelector('[data-slot="icon-stack-content"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="icon-stack-layer"]')).toHaveLength(6);
  });

  it('className 合并尺寸与语义色', () => {
    const { container } = render(<IconStack className="text-primary h-28 w-25" />);
    const root = container.querySelector('[data-slot="icon-stack"]');
    expect(root?.className).toContain('text-primary');
    expect(root?.className).toContain('h-28');
  });
});
