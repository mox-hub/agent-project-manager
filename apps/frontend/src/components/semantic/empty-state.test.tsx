import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/**
 * D14 补缺口（宪法 §18，empty-state 引用数 44，P1）。
 *
 * 上面三组既有断言全落在 className（形态差异）上；按 §18.2 本文件补的是
 * **语义与交互**：标题是可读标题、描述进入可访问文本流、action 是真按钮且可回调，
 * 以及 icon/visual 二选一的装配分支不互相吞没。样式断言保持原样未删（存量不动）。
 */
describe('EmptyState 语义与交互（D14 补缺口）', () => {
  it('标题是三级标题（§8.5 #7 语义标签，不靠大字模拟标题）', () => {
    render(<EmptyState icon={FileText} title="暂无工单" />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('暂无工单');
  });

  it('描述进入可访问文本流（朗读得到，不只是视觉副标题）', () => {
    render(<EmptyState title="暂无工单" description="新建一个开始" />);

    expect(screen.getByText('新建一个开始')).toBeInTheDocument();
  });

  it('action 是可交互按钮且回调可触发（§18.2 受控回调）', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <EmptyState
        title="暂无工单"
        action={<button type="button" onClick={onAction}>新建工单</button>}
      />,
    );

    await user.click(screen.getByRole('button', { name: '新建工单' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('不传 action 时不产生空操作区（不留假动作）', () => {
    render(<EmptyState title="暂无工单" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('icon 传入时渲染装饰图形（可视锚点存在）', () => {
    const { container } = render(<EmptyState icon={FileText} title="暂无工单" />);

    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('无 icon 且无 visual 时不渲染任何装饰图形（纯文字空态）', () => {
    const { container } = render(<EmptyState title="暂无工单" />);

    expect(container.querySelector('svg')).toBeNull();
  });

  it('page 变体同时容纳 visual + 标题 + 描述 + action（整页空态装配完整）', () => {
    render(
      <EmptyState
        variant="page"
        visual={<span data-testid="stack">插画</span>}
        title="还没有项目"
        description="从模板创建一个项目"
        action={<button type="button">新建项目</button>}
      />,
    );

    expect(screen.getByTestId('stack')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('还没有项目');
    expect(screen.getByText('从模板创建一个项目')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建项目' })).toBeInTheDocument();
  });

  it('仅传 title 即可渲染（description/action/icon 全为可选）', () => {
    render(<EmptyState title="只有标题" />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('只有标题');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
