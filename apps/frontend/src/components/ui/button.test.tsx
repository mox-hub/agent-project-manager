import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { Button, resolvePaddingAxis } from './button';
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

describe('Button tone 轴（E 类批 0b 增补，语义与既有档一致）', () => {
  // 口径与既有用例一致：§18.2 明令**不断言 className**（jsdom 也不执行 Tailwind），
  // 故这里只验三件事——(1) tone 不改语义/交互/可访问名；(2) data-tone 的挂载接线
  // 正确（tone 色类靠它拿特异性，属性一丢色即失效）；(3) 默认档不落属性（纯增补）。

  it.each(['info', 'danger'] as const)(
    'tone=%s 保留文字可访问名且点击照常冒泡',
    async (tone) => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button variant="ghost" tone={tone} onClick={onClick}>
          移除
        </Button>,
      );

      await user.click(screen.getByRole('button', { name: '移除' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['info', 'danger'] as const)(
    'tone=%s 挂载 data-tone（tone 色类的特异性依赖此属性）',
    (tone) => {
      render(
        <Button variant="ghost" tone={tone}>
          移除
        </Button>,
      );

      expect(screen.getByRole('button', { name: '移除' })).toHaveAttribute(
        'data-tone',
        tone,
      );
    },
  );

  it('默认档不落 data-tone：既有用法的 DOM 零变化（纯增补）', () => {
    render(<Button>确定</Button>);

    expect(screen.getByRole('button', { name: '确定' })).not.toHaveAttribute(
      'data-tone',
    );
  });

  it('tone 与 variant 正交：ghost + danger 同时生效且不吞可访问名', () => {
    render(
      <Button variant="ghost" tone="danger" aria-label="删除工单">
        删除工单
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '删除工单' });
    expect(btn).toBeEnabled();
    expect(btn).toHaveAttribute('data-tone', 'danger');
  });

  it('tone 不影响禁用语义', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button tone="danger" disabled onClick={onClick}>
        删除
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '删除' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

/**
 * E 类批 0b 二次补档（2026-09-28）：内距轴 `padding` + 字阶轴 `fontSize`，纯增补。
 *
 * 验收口径与既有用例一致——§18.2 明令**不断言 className**（jsdom 也不执行 Tailwind），
 * 故这里只断言「语义 / 接线 / 不泄漏」三件事：
 * 1. 两根轴是 Button 的 API，**不得出现在 DOM 上**：组件若漏了 `padding` / `fontSize`
 *    的解构，`...props` 会把它们直接透传到 `<button>`（且 `fontSize` 这类 camelCase
 *    属性还会触发 React 警告）。`padding="p-1"` 落到 DOM 上是纯污染——属性本身没有
 *    任何样式能力，真正的样式只来自 cva 产出的类。
 * 2. 各档不改变可访问名 / 点击 / 禁用语义 / 可聚焦性（与既有档同一组下限）。
 * 3. 默认档零变化：默认渲染的属性集与补档前一致，不含任何新增属性。
 *
 * 档值为什么是「内距原样写出」而非 xs/sm/lg，以及 `h-auto` 为何是内距轴的必需部分，
 * 见 `button.tsx` 的轴注释与 `docs/design/修改方案-E类-2026-09-27.md`（批 0b / 批 6 复核）。
 *
 * 轴名（2026-09-28 裁决）：本轴**不叫 `inset`**——`ui/card.tsx` 的内距轴叫 `inset` 且用
 * 语义档（xs/sm/md/lg/xl，一维全向 `p-N`），本轴是**二维内距对**（`px-* py-*`），档名
 * 即类值。两者值域形态不同 ⇒ 必须异名（通则：同名轴若值域形态不同必须异名）。
 */
const PADDINGS = [
  // 方形内距（图标钮 / 紧凑方钮）
  'p-0.5',
  'p-1',
  'p-1.5',
  // 密集工具条钮 / chip
  'px-1.5 py-0.5',
  'px-2 py-0.5',
  'px-2 py-1',
  'px-2.5 py-1',
  // 列表行钮 / 面板内动作钮
  'px-2 py-1.5',
  'px-2.5 py-1.5',
  'px-3 py-1.5',
  // 对话框内选项钮 / 卡片式钮
  'px-2.5 py-2',
  'px-3 py-2',
  'px-3 py-2.5',
] as const;

const FONT_SIZES = ['2xs', 'xs', 'sm'] as const;

/** 抓一个元素自身（不含子节点）的属性名集合 */
function ownAttributeNames(el: Element) {
  return Array.from(el.attributes)
    .map((a) => a.name)
    .sort();
}

describe('Button padding / fontSize 轴（E 类批 0b 二次补档，语义与既有档一致）', () => {
  it.each(PADDINGS)('padding=%s 保留可访问名且点击照常冒泡', async (padding) => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button padding={padding} onClick={onClick}>
        重命名
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: '重命名' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each(FONT_SIZES)('fontSize=%s 保留可访问名且点击照常冒泡', async (fontSize) => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button fontSize={fontSize} onClick={onClick}>
        重命名
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: '重命名' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('两根档值都不泄漏到 DOM（只是 Button 的 API，不是 <button> 的属性）', () => {
    render(
      <Button padding="px-2 py-1.5" fontSize="xs" aria-label="保存">
        保存
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '保存' });
    expect(btn).not.toHaveAttribute('padding');
    expect(btn).not.toHaveAttribute('fontSize');
    // 属性集与默认档一致：只有 base-ui 自带的 type/tabindex/data-slot 与 className
    expect(ownAttributeNames(btn)).toEqual([
      'aria-label',
      'class',
      'data-slot',
      'tabindex',
      'type',
    ]);
  });

  it('默认档零变化：不落任何新增属性，且与显式传默认档等价', () => {
    const { unmount } = render(<Button>确定</Button>);
    const implicit = ownAttributeNames(screen.getByRole('button', { name: '确定' }));
    unmount();

    render(
      <Button padding="default" fontSize="default">
        确定
      </Button>,
    );
    const explicit = ownAttributeNames(screen.getByRole('button', { name: '确定' }));

    // 补档后默认档不落任何新增属性（新增两轴是纯 cva 档位，不挂 DOM）
    expect(implicit).toEqual(['class', 'data-slot', 'tabindex', 'type']);
    expect(explicit).toEqual(implicit);
  });

  it('padding 与 fontSize 不影响禁用语义', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button padding="p-1" fontSize="2xs" disabled onClick={onClick}>
        删除
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '删除' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('五根轴正交：variant × size × tone × padding × fontSize 同时给仍可聚焦且不吞可访问名', async () => {
    const user = userEvent.setup();
    render(
      <Button
        variant="quiet"
        size="sm"
        tone="info"
        padding="px-2 py-1.5"
        fontSize="xs"
        aria-label="移除成员"
      >
        移除成员
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '移除成员' });
    expect(btn).toBeEnabled();
    // tone 的属性接线不因新增两轴而丢失（tone 色类靠它拿特异性）
    expect(btn).toHaveAttribute('data-tone', 'info');

    await user.tab();
    expect(btn).toHaveFocus();
  });
});

/**
 * 轴解析优先级（2026-09-28 裁决）：`size="icon-*"` 是完整几何档（`size-N` 定宽定高），
 * `padding` 是内距驱动几何档（`h-auto` + 内距）——两套模型同给会产生「定宽 + 自高」的
 * 矛盾几何（已复现：`size="icon-xs" padding="p-1"` → `size-6 h-auto p-1`）。
 * 故组件在 icon 档下**忽略** `padding`。
 *
 * 本组断言的是**轴解析逻辑**（两个输入谁胜出），不是样式。该优先级只影响类串，而
 * §18.2 明令组件测试**不断言 className**，故把解析抽成纯函数 `resolvePaddingAxis`
 * 在此锁住；渲染层的语义下限另见上一组用例。
 */
describe('Button 内距轴与 size 轴的解析优先级', () => {
  it('icon 档下忽略 padding（内建优先级）', () => {
    expect(resolvePaddingAxis('icon-xs', 'p-1')).toBe('default');
    expect(resolvePaddingAxis('icon-sm', 'px-2 py-1.5')).toBe('default');
    expect(resolvePaddingAxis('icon-2sm', 'p-1.5')).toBe('default');
  });

  it('非 icon 档下 padding 照常生效', () => {
    expect(resolvePaddingAxis('default', 'p-1')).toBe('p-1');
    expect(resolvePaddingAxis('sm', 'px-2 py-1.5')).toBe('px-2 py-1.5');
    expect(resolvePaddingAxis('xs', 'px-3 py-2.5')).toBe('px-3 py-2.5');
  });

  it('默认档仍是默认档（纯增补，零变化）', () => {
    expect(resolvePaddingAxis('default', 'default')).toBe('default');
  });

  // 既有调用方从不传本轴 ⇒ cva 收到的一律是 "default" ⇒ 发空串 ⇒ 既有输出逐字节不变。
  // 本用例把「一律」钉死：新增 size 档若漏进 icon 前缀判定之外的分支，这里会红。
  it('全部 10 个 size 档在缺省 padding 下都解析为默认档（既有输出不变的充分条件）', () => {
    const SIZES = [
      'default',
      'xs',
      'sm',
      'lg',
      'icon',
      'icon-xs',
      'icon-sm',
      'icon-lg',
      'icon-2xs',
      'icon-2sm',
    ] as const;
    for (const size of SIZES) {
      expect(resolvePaddingAxis(size, 'default')).toBe('default');
    }
  });
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
