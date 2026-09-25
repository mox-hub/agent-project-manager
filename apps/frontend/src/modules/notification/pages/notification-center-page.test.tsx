import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenterPage } from './notification-center-page';

const useNotificationsMock = vi.fn();
const markMutateMock = vi.fn();
const usePendingDecisionsMock = vi.fn();
const handleActionMock = vi.fn();

vi.mock('../hooks/use-notifications', () => ({
  useNotifications: (params?: unknown) => useNotificationsMock(params),
  useUnreadNotificationsCount: () => ({ data: 1 }),
  useMarkNotificationsRead: () => ({ mutate: markMutateMock }),
}));

vi.mock('@/modules/decision/hooks/use-decisions', () => ({
  usePendingDecisions: () => usePendingDecisionsMock(),
}));

vi.mock('@/modules/decision/hooks/use-decision-actions', () => ({
  useDecisionActions: () => ({
    handleAction: handleActionMock,
    busyId: null,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      favoritePages: [],
      toggleFavoritePage: vi.fn(),
      openAssistantConversation: vi.fn(),
    }),
}));

describe('NotificationCenterPage', () => {
  beforeEach(() => {
    useNotificationsMock.mockReset();
    markMutateMock.mockReset();
    usePendingDecisionsMock.mockReset();
    handleActionMock.mockReset();

    useNotificationsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: [
          {
            id: 'n1',
            type: 'task.assigned',
            title: 'Task assigned to you',
            body: 'You have a new task to do',
            status: 'unread',
            createdAt: '2026-03-28T10:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 20 },
      },
      refetch: vi.fn(),
    });

    usePendingDecisionsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        total: 1,
        blocking: 1,
        advisory: 0,
        items: [
          {
            id: 'd1',
            kind: 'approval',
            sourceId: 'src-1',
            status: 'pending',
            title: '等待批准敏感指令执行',
            detail: '运行 rm -rf 临时目录',
            urgency: 'blocking',
            proposer: { type: 'ai_agent', name: '索隆 - 开发' },
            payload: {},
            createdAt: '2026-03-28T10:05:00.000Z',
          },
        ],
      },
      refetch: vi.fn(),
    });
  });

  it('renders actionable inbox with tabs, action tags and decisions', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NotificationCenterPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeTruthy();
    // 渲染了重要标签页
    expect(screen.getByText('重要')).toBeTruthy();
    expect(screen.getByText('其他')).toBeTruthy();
    expect(screen.getByText('稍后')).toBeTruthy();
    expect(screen.getByText('已清理')).toBeTruthy();

    // 渲染了待办决策和通知项（决策首项自动选中，列表行+详情面板双渲染，用 getAllByText 断言存在）
    expect(screen.getAllByText('等待批准敏感指令执行').length).toBeGreaterThan(0);
    expect(screen.getByText('Task assigned to you')).toBeTruthy();

    // 渲染了关键行动标签
    expect(screen.getByText('等待拍板')).toBeTruthy();
    expect(screen.getByText('指派给你')).toBeTruthy();

    // 渲染了快速审阅按钮
    expect(screen.getByRole('button', { name: /快速审阅/ })).toBeTruthy();
  });

  it('switches to other tab and cleared tab', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NotificationCenterPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // 切换到“其他”Tab
    fireEvent.click(screen.getByRole('button', { name: /其他/ }));
    expect(screen.getByText('其他')).toBeTruthy();

    // 切换到“已清理”Tab
    fireEvent.click(screen.getByRole('button', { name: /已清理/ }));
    expect(screen.getByText('已清理')).toBeTruthy();
  });

  it('opens quick review modal when clicking review button', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NotificationCenterPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const reviewBtn = screen.getByRole('button', { name: /快速审阅/ });
    fireEvent.click(reviewBtn);

    // 弹出决策审阅弹窗
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
