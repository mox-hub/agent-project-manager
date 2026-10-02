import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DetailPageFrame } from './detail-page-frame';

function renderFrame(overrides?: Partial<Parameters<typeof DetailPageFrame>[0]>) {
  const toolbar = vi.fn(
    ({ sidebar }: { sidebar: { open: boolean; onToggle: () => void } }) => (
      <button type="button" data-testid="toolbar-toggle" onClick={sidebar.onToggle}>
        {sidebar.open ? 'open' : 'closed'}
      </button>
    ),
  );
  const utils = render(
    <DetailPageFrame
      aiPage="test.detail"
      toolbar={toolbar}
      main={<div data-testid="main-content">主栏</div>}
      aside={<div data-testid="aside-content">右栏</div>}
      {...overrides}
    />,
  );
  return { toolbar, ...utils };
}

describe('DetailPageFrame 详情页双栏母版', () => {
  it('默认渲染：toolbar 槽收到 sidebar 二态、主栏/右栏可见、data-ai-page 透传', () => {
    const { container } = renderFrame();
    // toolbar render prop 收到 open 态
    expect(screen.getByTestId('toolbar-toggle').textContent).toBe('open');
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('aside-content')).toBeInTheDocument();
    expect(container.querySelector('[data-ai-page="test.detail"]')).not.toBeNull();
  });

  it('点击 toolbar 开关：右栏隐藏态翻转（非受控内聚）', () => {
    const { container } = renderFrame();
    fireEvent.click(screen.getByTestId('toolbar-toggle'));
    expect(screen.getByTestId('toolbar-toggle').textContent).toBe('closed');
    // RightSidebar hidden：aside 仍在 DOM（hidden 由 RightSidebar 内部处理），开关文本已翻转
    expect(screen.getByTestId('aside-content')).toBeInTheDocument();
    void container;
  });

  it('受控模式：asideHidden=true 时 sidebar.open=false，onAsideHiddenChange 回调可达', () => {
    const onAsideHiddenChange = vi.fn();
    render(
      <DetailPageFrame
        aiPage="test.detail"
        toolbar={({ sidebar }) => (
          <button type="button" data-testid="toggle" onClick={sidebar.onToggle}>
            {sidebar.open ? 'open' : 'closed'}
          </button>
        )}
        main={<div>主栏</div>}
        aside={<div>右栏</div>}
        asideHidden
        onAsideHiddenChange={onAsideHiddenChange}
      />,
    );
    expect(screen.getByTestId('toggle').textContent).toBe('closed');
    fireEvent.click(screen.getByTestId('toggle'));
    expect(onAsideHiddenChange).toHaveBeenCalledWith(false);
  });

  it('aside 不传：不渲染右栏区域', () => {
    render(
      <DetailPageFrame
        aiPage="test.detail"
        toolbar={() => null}
        main={<div data-testid="only-main">主栏</div>}
      />,
    );
    expect(screen.getByTestId('only-main')).toBeInTheDocument();
    expect(screen.queryByTestId('aside-content')).toBeNull();
  });

  it('主栏宽度档走 L1 总表分发（默认 reading max-w-4xl；standard 覆写）', () => {
    const { container, rerender } = render(
      <DetailPageFrame
        aiPage="test.detail"
        toolbar={() => null}
        main={<div>主栏</div>}
      />,
    );
    expect(container.querySelector('.max-w-4xl')).not.toBeNull();
    rerender(
      <DetailPageFrame
        aiPage="test.detail"
        toolbar={() => null}
        main={<div>主栏</div>}
        mainWidth="standard"
      />,
    );
    expect(container.querySelector('.max-w-4xl')).toBeNull();
    expect(container.querySelector('.max-w-5xl')).not.toBeNull();
  });
});
