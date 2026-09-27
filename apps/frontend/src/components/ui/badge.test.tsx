import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

/**
 * D14 测试基线（宪法 §18）。badge 引用数 69，P0。
 *
 * badge 是纯展示原语：没有状态、没有回调，可测面就是
 * 「六个 variant 都渲染得出来」+「render API 能换成链接/自定义标签」。
 * 按 §18.2 不断言 className——variant 的差异属样式，交视觉回归。
 */
const VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const;

describe('Badge 渲染契约', () => {
  it('默认渲染为 span 且承载文本', () => {
    render(<Badge>进行中</Badge>);

    expect(screen.getByText('进行中').tagName).toBe('SPAN');
  });

  it.each(VARIANTS)('variant=%s 正常渲染（§18.2 全 variant 覆盖）', (variant) => {
    render(<Badge variant={variant}>{`徽标-${variant}`}</Badge>);

    expect(screen.getByText(`徽标-${variant}`)).toBeInTheDocument();
  });

  it('render API 换成 <a> 后仍是同一可访问名，且语义变为链接（§10.7）', () => {
    render(
      <Badge render={<a href="/app/issues?status=blocked" />}>阻塞</Badge>,
    );

    const link = screen.getByRole('link', { name: '阻塞' });
    expect(link).toHaveAttribute('href', '/app/issues?status=blocked');
  });

  it('render API 换成自定义标签元素时保留 children 文本', () => {
    render(<Badge render={<mark />}>回归</Badge>);

    expect(screen.getByText('回归').tagName).toBe('MARK');
  });

  it('透传 aria-* 与 data-*（调用方可标注语义）', () => {
    render(
      <Badge aria-label="工单状态：已完成" data-ai-component="ui.badge">
        完成
      </Badge>,
    );

    const badge = screen.getByLabelText('工单状态：已完成');
    expect(badge).toHaveAttribute('data-ai-component', 'ui.badge');
  });

  it('图标 + 文本组合时文本仍可被读取（不靠颜色/图形单独传达，§8.5 #4）', () => {
    render(
      <Badge variant="destructive">
        <svg aria-hidden="true" />
        失败
      </Badge>,
    );

    expect(screen.getByText('失败')).toBeInTheDocument();
  });
});
