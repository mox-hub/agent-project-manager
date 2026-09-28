import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

/**
 * D14 测试基线（宪法 §18）。card 引用数 55，P1「三态与表单核心」。
 *
 * Card 是装配原语（§10.2），没有状态与回调；可测面是**插槽装配结果**：
 * 各 slot 的文本确实落进 DOM、size 变体不丢内容、children 顺序稳定。
 * 按 §18.2 不断言 className——`data-size` 是结构与可访问性无关，
 * 但仍属样式开关，故只用它验证「变体不吞内容」，不验证取值组合。
 */
function renderFullCard(props?: {
  size?: 'default' | 'sm';
  variant?: 'default' | 'outline';
  border?: 'ring' | 'solid' | 'dashed';
  surface?: 'default' | 'flat' | 'translucent';
}) {
  return render(
    <Card {...props}>
      <CardHeader>
        <CardTitle>项目健康度</CardTitle>
        <CardDescription>近 7 天评分</CardDescription>
        <CardAction>
          <button type="button">刷新</button>
        </CardAction>
      </CardHeader>
      <CardContent>进度 62%</CardContent>
      <CardFooter>
        <button type="button">查看详情</button>
      </CardFooter>
    </Card>,
  );
}

describe('Card 插槽装配', () => {
  it('默认态：标题/描述/内容/页脚文本全部落位', () => {
    renderFullCard();

    expect(screen.getByText('项目健康度')).toBeInTheDocument();
    expect(screen.getByText('近 7 天评分')).toBeInTheDocument();
    expect(screen.getByText('进度 62%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看详情' })).toBeInTheDocument();
  });

  it('size=sm 变体不吞任何插槽内容', () => {
    renderFullCard({ size: 'sm' });

    expect(screen.getByText('项目健康度')).toBeInTheDocument();
    expect(screen.getByText('进度 62%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看详情' })).toBeInTheDocument();
  });

  /**
   * E 类批 0 增补（2026-09-27）：variant 轴（default 保持既有描边环 + 投影不动；
   * outline = 手写卡片壳主形态「描边 + 无投影 + 卡片圆角」）。
   *
   * 与上面的 size 用例同口径：§18.2 不断言 className，故只验
   * 「变体不吞内容」+「variant 落到 DOM 供样式与评审定位」。
   * 40 行手写壳的形态归纳与档位分界依据见交付报告。
   */
  it.each(['default', 'outline'] as const)(
    'variant=%s 不吞任何插槽内容',
    (variant) => {
      renderFullCard({ variant });

      expect(screen.getByText('项目健康度')).toBeInTheDocument();
      expect(screen.getByText('近 7 天评分')).toBeInTheDocument();
      expect(screen.getByText('进度 62%')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '查看详情' })).toBeEnabled();
    },
  );

  it('variant 落到 data-variant（与既有 data-size 同口径），默认档为 default', () => {
    const { container } = renderFullCard({ variant: 'outline' });

    expect(container.querySelector('[data-slot="card"]')).toHaveAttribute(
      'data-variant',
      'outline',
    );

    const { container: plain } = renderFullCard();
    expect(plain.querySelector('[data-slot="card"]')).toHaveAttribute(
      'data-variant',
      'default',
    );
  });

  /**
   * E 类批 0b 增补：Card 第二轴 `border`（描边样式）与第三轴 `surface`（表面/强调层级）。
   * 与上面 variant 用例同口径——§18.2 不断言 className，只验「不吞内容」+
   * 「轴值落到 data-* 供评审与后续语义断言定位」。两轴与 size/variant 正交，
   * 故同时覆盖交叉组合（任一圈不吞样式/不吞内容）。
   */
  const BORDERS = ['ring', 'solid', 'dashed'] as const;
  const SURFACES = ['default', 'flat', 'translucent'] as const;

  it.each(BORDERS)('border=%s 不吞任何插槽内容', (border) => {
    renderFullCard({ border });

    expect(screen.getByText('项目健康度')).toBeInTheDocument();
    expect(screen.getByText('进度 62%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看详情' })).toBeEnabled();
  });

  it.each(SURFACES)('surface=%s 不吞任何插槽内容', (surface) => {
    renderFullCard({ surface });

    expect(screen.getByText('项目健康度')).toBeInTheDocument();
    expect(screen.getByText('近 7 天评分')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刷新' })).toBeEnabled();
  });

  it('border/surface 落到 data-*，默认档为 ring / default（与 data-variant 同口径）', () => {
    const { container } = renderFullCard({
      variant: 'outline',
      border: 'dashed',
      surface: 'translucent',
    });
    const card = container.querySelector('[data-slot="card"]');

    expect(card).toHaveAttribute('data-border', 'dashed');
    expect(card).toHaveAttribute('data-surface', 'translucent');
    // 交叉轴不得互吞：variant 与 size 的同名断言仍成立
    expect(card).toHaveAttribute('data-variant', 'outline');
    expect(card).toHaveAttribute('data-size', 'default');

    const { container: plain } = renderFullCard();
    const plainCard = plain.querySelector('[data-slot="card"]');
    expect(plainCard).toHaveAttribute('data-border', 'ring');
    expect(plainCard).toHaveAttribute('data-surface', 'default');
  });

  it.each([
    ['default', 'flat'],
    ['outline', 'translucent'],
  ] as const)('variant=%s × surface=%s 组合不吞内容', (variant, surface) => {
    renderFullCard({ variant, surface });

    expect(screen.getByText('项目健康度')).toBeInTheDocument();
    expect(screen.getByText('进度 62%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看详情' })).toBeEnabled();
  });

  it('CardAction 内的交互元素可被键盘/鼠标命中（行内操作不靠视觉位置）', () => {
    renderFullCard();

    expect(screen.getByRole('button', { name: '刷新' })).toBeEnabled();
  });

  it('透传原生属性与 data-ai-* 标注（§12）', () => {
    render(
      <Card data-ai-component="ui.card" data-ai-role="content" aria-label="项目卡片">
        <CardContent>内容</CardContent>
      </Card>,
    );

    const card = screen.getByLabelText('项目卡片');
    expect(card).toHaveAttribute('data-ai-component', 'ui.card');
    expect(card).toHaveAttribute('data-ai-role', 'content');
  });

  it('纯内容 Card（无 header/footer）不产生未装配的空壳插槽', () => {
    const { container } = render(
      <Card>
        <CardContent>只有内容</CardContent>
      </Card>,
    );

    expect(screen.getByText('只有内容')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
    expect(container.querySelector('[data-slot="card-footer"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="card-content"]')).toHaveLength(1);
  });

  it('插槽顺序稳定（header → content → footer，DOM 顺序即阅读顺序）', () => {
    const { container } = renderFullCard();

    const text = container.textContent ?? '';
    expect(text.indexOf('项目健康度')).toBeLessThan(text.indexOf('进度 62%'));
    expect(text.indexOf('进度 62%')).toBeLessThan(text.indexOf('查看详情'));
  });
});
