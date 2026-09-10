import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardArrow,
  HoverCardContent,
  HoverCardTrigger,
  hoverCardContentVariants,
} from './hover-card';

// jsdom 无 ResizeObserver，floating-ui 定位依赖它（同 route-preview-trigger.test 约定）
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

function getContent(): HTMLElement | null {
  return document.querySelector('[data-slot="hover-card-content"]');
}

describe('hoverCardContentVariants', () => {
  it('默认 md 档 = w-64 + p-4（与历史默认渲染一致）', () => {
    const cls = hoverCardContentVariants();
    expect(cls).toContain('w-64');
    expect(cls).toContain('p-4');
    expect(cls).not.toContain('w-72');
  });

  it('四档宽度对齐规范：sm=w-56 / md=w-64 / lg=w-72 / xl=w-80', () => {
    // cn（twMerge）合并后宽度档互斥：cva 原串含 base w-64 + 档位类，渲染时由 cn 去重
    const merged = (size: 'sm' | 'md' | 'lg' | 'xl') => cn(hoverCardContentVariants({ size }));
    expect(merged('sm')).toContain('w-56');
    expect(merged('sm')).not.toContain('w-64');
    expect(merged('md')).toContain('w-64');
    expect(merged('lg')).toContain('w-72');
    expect(merged('lg')).not.toContain('w-64');
    expect(merged('xl')).toContain('w-80');
    expect(merged('xl')).not.toContain('w-72');
  });
});

describe('HoverCard 组件', () => {
  it('hover 打开后挂载内容（默认档）', async () => {
    const user = userEvent.setup();
    render(
      <HoverCard>
        <HoverCardTrigger delay={0} closeDelay={0}>
          <button type="button">trigger</button>
        </HoverCardTrigger>
        <HoverCardContent>
          <p>card-body</p>
        </HoverCardContent>
      </HoverCard>,
    );

    await act(async () => {
      await user.hover(screen.getByText('trigger'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByText('card-body')).toBeInTheDocument();
    });
    expect(getContent()?.className).toContain('w-64');
  });

  it('size=lg 渲染 w-72，且 className 覆写优先于档位', async () => {
    const user = userEvent.setup();
    render(
      <HoverCard>
        <HoverCardTrigger delay={0} closeDelay={0}>
          <button type="button">trigger-lg</button>
        </HoverCardTrigger>
        <HoverCardContent size="lg" className="w-80">
          <p>card-body-lg</p>
        </HoverCardContent>
      </HoverCard>,
    );

    await act(async () => {
      await user.hover(screen.getByText('trigger-lg'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByText('card-body-lg')).toBeInTheDocument();
    });
    const cls = getContent()?.className ?? '';
    expect(cls).toContain('w-80'); // className 覆写赢
    expect(cls).not.toContain('w-72'); // twMerge 去掉档位宽度
    expect(cls).not.toContain('w-64');
  });

  it('HoverCardArrow 默认不渲染，显式放入 children 才出现', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <HoverCard>
        <HoverCardTrigger delay={0} closeDelay={0}>
          <button type="button">trigger-arrow</button>
        </HoverCardTrigger>
        <HoverCardContent>
          <p>card-body-arrow</p>
        </HoverCardContent>
      </HoverCard>,
    );

    await act(async () => {
      await user.hover(screen.getByText('trigger-arrow'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => {
      expect(screen.getByText('card-body-arrow')).toBeInTheDocument();
    });
    expect(document.querySelector('[data-slot="hover-card-arrow"]')).toBeNull();

    rerender(
      <HoverCard>
        <HoverCardTrigger delay={0} closeDelay={0}>
          <button type="button">trigger-arrow</button>
        </HoverCardTrigger>
        <HoverCardContent>
          <HoverCardArrow data-testid="arrow" />
          <p>card-body-arrow</p>
        </HoverCardContent>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="hover-card-arrow"]')).not.toBeNull();
    });
  });
});
