import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { RoutePreviewTrigger } from '../route-preview-trigger';

// jsdom 无 ResizeObserver，floating-ui 定位依赖它
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

// base-ui/floating-ui 会在 hover 打开的异步更新（rAF/timer）里触发 setState，
// 统一包进 act 冲刷，避免 "not wrapped in act(...)" 警告
async function hoverInAct(user: ReturnType<typeof userEvent.setup>, element: HTMLElement) {
  await act(async () => {
    await user.hover(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('RoutePreviewTrigger', () => {
  it('hover 触发元素后挂载预览卡片（generic 卡：标题 + 路径）', async () => {
    const user = userEvent.setup();
    render(
      <RoutePreviewTrigger path="/app/projects" title="Projects" delay={0}>
        <button type="button">projects-tab</button>
      </RoutePreviewTrigger>
    );

    await hoverInAct(user, screen.getByText('projects-tab'));

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
    expect(screen.getByText('/app/projects')).toBeInTheDocument();
  });

  it('hover 离开后延迟关闭卡片', async () => {
    const user = userEvent.setup();
    render(
      <RoutePreviewTrigger path="/app/tasks" title="Tasks" delay={0} closeDelay={0}>
        <button type="button">tasks-tab</button>
      </RoutePreviewTrigger>
    );

    await hoverInAct(user, screen.getByText('tasks-tab'));
    await waitFor(() => {
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    await act(async () => {
      await user.unhover(screen.getByText('tasks-tab'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => {
      expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    });
  });
});
