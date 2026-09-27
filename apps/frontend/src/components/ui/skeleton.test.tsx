import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonChart,
  SkeletonList,
  SkeletonTable,
  SkeletonText,
} from './skeleton';

/**
 * D14 测试基线（宪法 §18）。skeleton 引用数 54，P1「三态」。
 *
 * 骨架屏是**占位几何**：它的可测契约只有「会渲染出几个占位块」——
 * 各块的尺寸/轮播色全在 className 上（§18.2 禁止断言）。
 * 因此本文件用结构标记 `data-slot="skeleton"` 计数，而不是比对类名：
 * 数量算错（少一行、串行、0 个占位）会让加载态塌陷成空白，这才是真回归。
 */
const countSkeletons = (el: HTMLElement) =>
  el.querySelectorAll('[data-slot="skeleton"]').length;

describe('Skeleton 基础占位', () => {
  it('单块 Skeleton 渲染一个占位节点', () => {
    const { container } = render(<Skeleton />);

    expect(countSkeletons(container)).toBe(1);
  });

  it('透传原生属性（可承载 data-ai-* 标注，§12）', () => {
    const { container } = render(<Skeleton data-ai-role="loading-block" />);

    expect(container.querySelector('[data-ai-role="loading-block"]')).not.toBeNull();
  });
});

describe('SkeletonText 行数契约', () => {
  it.each([1, 2, 3, 6])('lines=%s 渲染同数量文本行', (lines) => {
    const { container } = render(<SkeletonText lines={lines} />);

    expect(countSkeletons(container)).toBe(lines);
  });

  it('默认 3 行', () => {
    const { container } = render(<SkeletonText />);

    expect(countSkeletons(container)).toBe(3);
  });
});

describe('SkeletonCard 装配开关', () => {
  it('默认：标题 + 描述 + 2 行正文 = 4 块', () => {
    const { container } = render(<SkeletonCard />);

    expect(countSkeletons(container)).toBe(4);
  });

  it('avatar=true 多一块头像占位（5 块）', () => {
    const { container } = render(<SkeletonCard avatar />);

    expect(countSkeletons(container)).toBe(5);
  });

  it('title/description=false 时对应占位被裁撤（只剩正文行）', () => {
    const { container } = render(
      <SkeletonCard avatar={false} title={false} description={false} lines={3} />,
    );

    expect(countSkeletons(container)).toBe(3);
  });

  it('lines 直通正文行数', () => {
    const { container } = render(<SkeletonCard title={false} description={false} lines={5} />);

    expect(countSkeletons(container)).toBe(5);
  });
});

describe('SkeletonAvatar', () => {
  it.each(['sm', 'md', 'lg'] as const)('size=%s 渲染一块头像占位', (size) => {
    const { container } = render(<SkeletonAvatar size={size} />);

    expect(countSkeletons(container)).toBe(1);
  });

  it('默认 size 也渲染一块（缺省档可用）', () => {
    const { container } = render(<SkeletonAvatar />);

    expect(countSkeletons(container)).toBe(1);
  });
});

describe('SkeletonList 条数契约', () => {
  it('count=5、无头像：每条 4 块 = 20', () => {
    const { container } = render(<SkeletonList />);

    expect(countSkeletons(container)).toBe(20);
  });

  it('count=3、带头像：每条 5 块 = 15', () => {
    const { container } = render(<SkeletonList count={3} avatar />);

    expect(countSkeletons(container)).toBe(15);
  });

  it('count=0 时渲染空壳但不抛错（边界不炸）', () => {
    const { container } = render(<SkeletonList count={0} />);

    expect(countSkeletons(container)).toBe(0);
  });
});

describe('SkeletonTable 行列契约', () => {
  it('默认 5 行 4 列：表头 4 + 5×4 = 24', () => {
    const { container } = render(<SkeletonTable />);

    expect(countSkeletons(container)).toBe(24);
  });

  it('rows=2 columns=3：表头 3 + 2×3 = 9', () => {
    const { container } = render(<SkeletonTable rows={2} columns={3} />);

    expect(countSkeletons(container)).toBe(9);
  });

  it('rows=0 时只剩表头（不渲染出多余空行）', () => {
    const { container } = render(<SkeletonTable rows={0} columns={2} />);

    expect(countSkeletons(container)).toBe(2);
  });
});

describe('SkeletonChart', () => {
  it('柱 + 轴标签各 7 块 = 14', () => {
    const { container } = render(<SkeletonChart />);

    expect(countSkeletons(container)).toBe(14);
  });
});
