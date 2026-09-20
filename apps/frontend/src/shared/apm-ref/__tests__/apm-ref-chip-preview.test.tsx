import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApmRefLink } from '../apm-ref-chip';

// jsdom 无 ResizeObserver，floating-ui 定位依赖它
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

// 预览数据链 mock：useDocumentDetail 将以短号 D17 被调用（后端 findOne 短号兼容）
vi.mock('@/modules/document/hooks/use-document-detail', () => ({
  useDocumentDetail: () => ({
    data: {
      id: 'cuid-doc-1',
      shortId: 'D17',
      title: '验收门禁设计',
      status: 'published',
      docRole: 'design',
    },
    isLoading: false,
    isError: false,
  }),
}));

describe('ApmRefLink hover 预览卡（v2 纪要 §13：同一 preview card）', () => {
  it('hover chip 后挂载预览卡，预览数据按短号解析', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ApmRefLink href="apm://apm/doc/D17">验收门禁设计</ApmRefLink>
      </MemoryRouter>,
    );

    await act(async () => {
      await user.hover(screen.getByText('验收门禁设计'));
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    await waitFor(() => {
      // 预览卡头回写实体的标题（fallbackTitle 为空时来自数据）
      expect(screen.getAllByText('验收门禁设计').length).toBeGreaterThanOrEqual(1);
    });
  });
});
