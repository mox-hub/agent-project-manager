import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListChecks } from 'lucide-react';
import { DetailSection } from './detail-section';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('DetailSection 详情页主栏可收缩分区', () => {
  it('默认展开：标题/图标/计数渲染，内容可见', () => {
    const { container } = render(
      <DetailSection icon={<ListChecks className="size-3.5" />} title="子任务" count="2/5">
        <div>内容 A</div>
      </DetailSection>,
    );
    expect(screen.getByText('子任务')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText('内容 A')).toBeInTheDocument();
    // 标题档 text-xs + uppercase（裁决②）
    const heading = screen.getByText('子任务').closest('div');
    expect(heading?.className).toContain('text-xs');
    expect(heading?.className).toContain('uppercase');
    // 平铺形态：无卡底（区别于 SidebarPanel 的 border/bg-card）
    expect(container.querySelector('.bg-card')).toBeNull();
    // 计数档 text-3xs + tabular-nums
    expect(screen.getByText('2/5').className).toContain('text-3xs');
    expect(screen.getByText('2/5').className).toContain('tabular-nums');
  });

  it('点击收缩三角：aria-expanded 翻转 + 内容 grid-rows-[0fr]', () => {
    const { container } = render(
      <DetailSection title="执行项">
        <div>内容 B</div>
      </DetailSection>,
    );
    const toggle = screen.getByRole('button', { name: 'common.collapse' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.grid-rows-\\[1fr\\]')).not.toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'common.expand' }));
    expect(container.querySelector('.grid-rows-\\[0fr\\]')).not.toBeNull();
    // DOM 保留（动画收缩不是卸载）
    expect(screen.getByText('内容 B')).toBeInTheDocument();
  });

  it('受控模式：collapsed prop 驱动，内置 state 不接管', () => {
    const { container, rerender } = render(
      <DetailSection title="依赖" collapsed onToggle={() => {}}>
        <div>内容 C</div>
      </DetailSection>,
    );
    expect(container.querySelector('.grid-rows-\\[0fr\\]')).not.toBeNull();
    rerender(
      <DetailSection title="依赖" collapsed={false} onToggle={() => {}}>
        <div>内容 C</div>
      </DetailSection>,
    );
    expect(container.querySelector('.grid-rows-\\[1fr\\]')).not.toBeNull();
  });

  it('collapsible=false：无收缩三角、内容不经 grid 动画层（描述区形态）', () => {
    const { container } = render(
      <DetailSection title="描述" collapsible={false}>
        <div>内容 D</div>
      </DetailSection>,
    );
    expect(screen.queryByRole('button', { name: 'common.collapse' })).toBeNull();
    expect(container.querySelector('.grid-rows-\\[1fr\\]')).toBeNull();
    expect(screen.getByText('内容 D')).toBeInTheDocument();
  });

  it('action 槽渲染在收缩三角之前', () => {
    render(
      <DetailSection
        title="自定义字段"
        action={<button type="button">编辑</button>}
      >
        <div>内容 E</div>
      </DetailSection>,
    );
    const edit = screen.getByRole('button', { name: '编辑' });
    const toggle = screen.getByRole('button', { name: 'common.collapse' });
    // DOM 序：action 在内置三角前
    expect(edit.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('count 不传时不渲染计数槽（不留空壳）', () => {
    const { container } = render(
      <DetailSection title="描述" collapsible={false}>
        <div>内容 F</div>
      </DetailSection>,
    );
    expect(container.querySelector('.tabular-nums')).toBeNull();
  });
});
