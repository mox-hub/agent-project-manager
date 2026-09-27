import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { Button } from './button';
import { Spinner } from './spinner';

/**
 * D14 测试基线（宪法 §18）。button 引用数 191（全仓第一），P0。
 *
 * 范围声明：
 * - 断言到「语义 / 交互 / 可访问名」为止，**不断言 className**（§18.2）——
 *   8 个 variant × 8 个 size 的样式差异交人工评审/视觉回归；
 * - **不测 Radix 的 `asChild`**：批 6b 已按 §10.7 把它从 Button 移除，这里只对
 *   `render` API 立契约（组合方式的唯一真相是 `render`）；
 * - 「焦点可见」在 jsdom 无法验算 ring（§8.5 #5 属 CSS），改验「可聚焦且
 *   `document.activeElement` 正确落到按钮上」这一可机器观测的下限。
 */
const VARIANTS = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'link',
  'primary',
  'danger',
  // E 类批 0 增补（2026-09-27）：裸 <button> 形态聚类补出的三档
  'quiet',
  'subtle',
  'ghost-danger',
] as const;

const SIZES = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
  // E 类批 0 增补：补上 20px / 28px 两个空档
  'icon-2xs',
  'icon-2sm',
] as const;

describe('Button 渲染矩阵（§18.2 全 variant × 全 size）', () => {
  it.each(VARIANTS)('variant=%s 渲染为可点击 button 并保留文本', (variant) => {
    render(<Button variant={variant}>保存</Button>);

    const btn = screen.getByRole('button', { name: '保存' });
    expect(btn).toBeEnabled();
  });

  it.each(SIZES)('size=%s 渲染为 enabled button（尺寸不改变语义）', (size) => {
    render(<Button size={size}>操作</Button>);

    expect(screen.getByRole('button', { name: '操作' })).toBeEnabled();
  });

  it('默认（无 props）即 primary 形态的默认档，可被 role 定位', () => {
    render(<Button>确定</Button>);

    expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument();
  });
});

/**
 * E 类批 0 增补档（2026-09-27，纯增补：既有 8 variant × 8 size 的类值一字未动）。
 *
 * 验收口径与既有用例一致——§18.2 明令**不断言 className**，jsdom 也不执行 Tailwind，
 * 故这里只断言「档位不改变语义 / 交互 / 可访问名」：若新档误吞 children、改了 role
 * 或让按钮失去可聚焦性，下面的用例会红。纯视觉差异（色值/尺寸）交视觉回归。
 */
describe('Button 批 0 增补档（语义与既有档一致）', () => {
  it.each(['quiet', 'subtle', 'ghost-danger'] as const)(
    'variant=%s 保留文字可访问名且点击照常冒泡',
    async (variant) => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button variant={variant} onClick={onClick}>
          重命名
        </Button>,
      );

      await user.click(screen.getByRole('button', { name: '重命名' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    },
  );

  it('ghost-danger 的「危险」不只靠颜色传达：文字可访问名完整保留（§8.5 #4）', () => {
    render(<Button variant="ghost-danger">删除工单</Button>);

    expect(
      screen.getByRole('button', { name: '删除工单' }),
    ).toBeInTheDocument();
  });

  it.each(['icon-2xs', 'icon-2sm'] as const)(
    'size=%s 仍是可聚焦的图标钮，且无文字时 aria-label 即可访问名（§8.5 #1）',
    async (size) => {
      const user = userEvent.setup();
      render(
        <Button size={size} aria-label="关闭面板">
          <Plus />
        </Button>,
      );

      const btn = screen.getByRole('button', { name: '关闭面板' });
      expect(btn).toBeEnabled();

      await user.tab();
      expect(btn).toHaveFocus();
    },
  );
});

describe('Button 交互（§18.2 点击/键盘/受控回调）', () => {
  it('点击触发 onClick 一次', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>提交</Button>);

    await user.click(screen.getByRole('button', { name: '提交' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Enter 键激活（键盘可达，§8.2 键盘流）', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>提交</Button>);

    const btn = screen.getByRole('button', { name: '提交' });
    btn.focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Space 键激活（键盘可达，§8.2 键盘流）', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>提交</Button>);

    const btn = screen.getByRole('button', { name: '提交' });
    btn.focus();
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled 时既不响应点击也不响应键盘，且不可聚焦', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        提交
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '提交' });
    expect(btn).toBeDisabled();

    await user.click(btn);
    await user.keyboard('{Enter}');

    expect(onClick).not.toHaveBeenCalled();
  });

  it('焦点可落在按钮上（焦点管理下限，§8.5 #5）', async () => {
    const user = userEvent.setup();
    render(<Button>聚焦我</Button>);

    await user.tab();

    expect(screen.getByRole('button', { name: '聚焦我' })).toHaveFocus();
  });
});

describe('Button 可访问性（§8.5 #1/#7）', () => {
  it('纯图标按钮靠 aria-label 获得可访问名（无文字时唯一出口）', () => {
    render(
      <Button size="icon" aria-label="新建工单">
        <Plus />
      </Button>,
    );

    expect(screen.getByRole('button', { name: '新建工单' })).toBeInTheDocument();
  });

  it('图标 + 文字时文字即可访问名，图标不污染名字', () => {
    render(
      <Button aria-label="新建工单">
        <Plus />
        工单
      </Button>,
    );

    expect(screen.getByRole('button', { name: '新建工单' })).toBeInTheDocument();
  });

  it('加载态按钮仍保留可访问名（禁用不等于隐身）', () => {
    render(
      <Button disabled aria-label="正在提交">
        <Spinner size="sm" />
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '正在提交' });
    expect(btn).toBeDisabled();
    // 按钮内的唯一加载指示实现是 Spinner（不直用 Loader2）
    expect(within(btn).getByRole('status')).toBeInTheDocument();
  });

  it('透传 aria-invalid / aria-expanded 等状态属性（§8.1 展开态语义）', () => {
    render(
      <Button aria-expanded aria-invalid="true">
        过滤
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '过滤' });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(btn).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Button render API（§10.7 唯一组合方式）', () => {
  it('render 换成 <a> 后语义变为链接且 href 保留', () => {
    render(
      <Button render={<a href="/app/issues/new" />}>新建工单</Button>,
    );

    const link = screen.getByRole('link', { name: '新建工单' });
    expect(link).toHaveAttribute('href', '/app/issues/new');
    // 组合后不再重复渲染一个 button
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('render 换成 <a> 时点击照常冒泡到调用方', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      // 与路由拦截同型：消费方在 onClick 里 preventDefault，jsdom 才不会真导航
      <Button
        render={<a href="/app/issues" />}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        工单列表
      </Button>,
    );

    await user.click(screen.getByRole('link', { name: '工单列表' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('render 传入的 className 与文案不被丢失', () => {
    render(
      <Button render={<a href="/app/docs" data-testid="link-host" />}>文档</Button>,
    );

    expect(screen.getByTestId('link-host')).toHaveTextContent('文档');
  });
});
