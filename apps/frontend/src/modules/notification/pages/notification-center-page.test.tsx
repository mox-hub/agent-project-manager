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

    // 标题走 i18n（测试桩返回键名，实机 zh-CN 显示「通知」）
    expect(await screen.findByRole('heading', { name: 'notification.title' })).toBeTruthy();
    // 渲染了重要标签页
    expect(screen.getByText('重要')).toBeTruthy();
    expect(screen.getByText('其他')).toBeTruthy();
    expect(screen.getByText('稍后')).toBeTruthy();
    expect(screen.getByText('已清理')).toBeTruthy();

    // 渲染了待办决策和通知项（列表铺满全宽，详情不再常驻右栏，仅列表单渲染）
    expect(screen.getByText('等待批准敏感指令执行')).toBeTruthy();
    expect(screen.getByText('Task assigned to you')).toBeTruthy();

    // 渲染了关键行动标签
    expect(screen.getByText('等待拍板')).toBeTruthy();
    expect(screen.getByText('指派给你')).toBeTruthy();

    // 渲染了快速审阅按钮
    expect(screen.getByRole('button', { name: /快速审阅/ })).toBeTruthy();

    // 详情 Sheet 初始不打开
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens decision sheet when clicking a decision row and closes it', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NotificationCenterPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // 点击决策行 → Sheet 打开，出现就地拍板决策卡
    fireEvent.click(await screen.findByText('等待批准敏感指令执行'));
    const dialog = await screen.findByRole('dialog', { name: '等待批准敏感指令执行' });
    expect(dialog).toBeTruthy();
    expect(screen.getByText('决策中心 · 就地拍板')).toBeTruthy();

    // 点击关闭按钮 → Sheet 收起
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('opens notification detail sheet with archive action when clicking a notification row', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NotificationCenterPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByText('Task assigned to you'));
    const dialog = await screen.findByRole('dialog', { name: 'Task assigned to you' });
    expect(dialog).toBeTruthy();
    // 通知详情正文与清理归档动作保留（功能不变，仅容器改 Sheet）
    expect(screen.getByText('You have a new task to do')).toBeTruthy();
    expect(screen.getByRole('button', { name: /清理归档/ })).toBeTruthy();
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
