import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

/**
 * D14 测试基线（宪法 §18）。dialog 引用数 67，P0。
 *
 * dialog 是**含焦点管理的浮层**（§18.1 第二条），本文件把两件事立为硬契约：
 * ① `role="dialog"` + 标题可访问名（§8.5 #2「所有 Dialog 必须有标题」）；
 * ② 打开/关闭的状态迁移（受控 `onOpenChange`、Escape、关闭按钮）。
 * **不断言 className/动画类**（§18.2）——浮层的入场动效交人工评审。
 */

/** 受控宿主：把 open 状态与 onOpenChange 暴露给断言 */
function ControlledDialog(props: {
  onOpenChange?: (open: boolean) => void;
  showCloseButton?: boolean;
  footerClose?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        props.onOpenChange?.(next);
      }}
    >
      <DialogTrigger>打开设置</DialogTrigger>
      <DialogContent showCloseButton={props.showCloseButton}>
        <DialogHeader>
          <DialogTitle>仓库设置</DialogTitle>
          <DialogDescription>修改后立即生效。</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton={props.footerClose}>
          <DialogClose>取消</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog 打开/关闭状态机（§18.2 交互）', () => {
  it('初始关闭：trigger 在、dialog 不在', () => {
    render(<ControlledDialog />);

    expect(screen.getByRole('button', { name: '打开设置' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('点击 trigger 打开，并把 open=true 通知调用方', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledDialog onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('Escape 关闭浮层（§8.2 浮层 Escape 关闭）', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledDialog onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('内置关闭按钮可关闭，且带可访问名（§8.5 #1）', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledDialog onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('showCloseButton=false 时不渲染关闭按钮（装饰性关闭可裁撤）', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog showCloseButton={false} />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('DialogClose 子元素（取消）同样关闭浮层', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));
    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('DialogFooter showCloseButton 渲染出闭合按钮（装配开关生效）', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog footerClose />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));

    // 内置右上角关闭 + 页脚 Close 各一
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(2);
  });
});

describe('Dialog 无障碍（§8.5 #2 必须有标题）', () => {
  it('dialog 的可访问名来自 DialogTitle', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('仓库设置');
  });

  it('DialogDescription 成为可访问描述', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('修改后立即生效。');
  });

  it('打开后浮层内容可被可访问查询定位（标题/描述都在 dialog 内）', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(screen.getByText('仓库设置'));
    expect(dialog).toContainElement(screen.getByText('修改后立即生效。'));
  });

  it('关闭后浮层内容从可访问树移除（不残留隐藏但仍可读的节点）', async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);

    await user.click(screen.getByRole('button', { name: '打开设置' }));
    expect(screen.getByText('仓库设置')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByText('仓库设置')).toBeNull();
  });
});

describe('Dialog 受控用法与属性透传', () => {
  it('完全受控（open 由外部驱动）时 open=false 不渲染内容', () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>受控标题</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('DialogContent 透传自定义属性（可承载 data-ai-* 标注，§12）', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent data-ai-component="ui.dialog" data-ai-role="form">
          <DialogTitle>表单</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: '打开' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-ai-component', 'ui.dialog');
    expect(dialog).toHaveAttribute('data-ai-role', 'form');
  });

  it('非受控用法（defaultOpen）直接打开，无需外部状态', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>默认打开</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName('默认打开');
  });

  it('trigger 上的 click 处理器不被 DialogTrigger 吞掉', () => {
    const onClick = vi.fn();
    render(
      <Dialog>
        <DialogTrigger onClick={onClick}>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>标题</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
