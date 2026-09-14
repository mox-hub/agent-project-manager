import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileText } from 'lucide-react';
import { EmptyState } from './empty-state';
import { AsyncState } from './async-state';

// vitest 环境无 i18next 实例，AsyncState 走 t() 回退文案（同其他组件测试约定）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

describe('EmptyState 三分场景变体', () => {
  it('默认 card 形态：min-h-40 紧凑卡片', () => {
    const { container } = render(<EmptyState icon={FileText} title="暂无数据" />);
    const root = container.querySelector('div');
    expect(root?.className).toContain('min-h-40');
    expect(root?.className).not.toContain('h-full');
  });

  it('page 变体：h-full 撑满父容器 + min-h-100 兜底', () => {
    const { container } = render(<EmptyState variant="page" title="暂无数据" />);
    const root = container.querySelector('div');
    expect(root?.className).toContain('h-full');
    expect(root?.className).toContain('min-h-100');
    expect(root?.className).not.toContain('min-h-40');
  });

  it('visual 槽整体替换图标圆块', () => {
    const { container } = render(
      <EmptyState visual={<span data-testid="custom-visual">插画</span>} title="暂无数据" />,
    );
    expect(screen.getByTestId('custom-visual')).toBeInTheDocument();
    // 无 icon 圆块（muted box）
    expect(container.querySelector('span.bg-muted')).toBeNull();
  });
});

describe('AsyncState 空态透传', () => {
  it('emptyVariant/emptyVisual 透传到 EmptyState', () => {
    const { container } = render(
      <AsyncState
        isEmpty
        emptyVariant="page"
        emptyVisual={<span data-testid="stack-visual">插画</span>}
      >
        <p>content</p>
      </AsyncState>,
    );
    expect(screen.getByTestId('stack-visual')).toBeInTheDocument();
    expect(container.firstChild?.firstChild).toBeTruthy();
    const emptyRoot = screen.getByTestId('stack-visual').parentElement?.parentElement;
    expect(emptyRoot?.className).toContain('h-full');
    expect(screen.queryByText('content')).toBeNull();
  });

  it('错误态恒为 card 简式（不受 emptyVariant 影响）', () => {
    const { container } = render(
      <AsyncState error="boom" emptyVariant="page">
        <p>content</p>
      </AsyncState>,
    );
    const root = container.querySelector('div');
    expect(root?.className).toContain('min-h-40');
    expect(root?.className).not.toContain('h-full');
  });
});
