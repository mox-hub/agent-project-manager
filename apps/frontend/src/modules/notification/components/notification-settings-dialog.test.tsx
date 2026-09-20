import { describe, expect, it, vi, beforeAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationSettingsDialog } from './notification-settings-dialog';
import { notificationApi } from '../api/notification-api';

// base-ui Switch 点击路径依赖 window.PointerEvent（jsdom 缺失）
beforeAll(() => {
  if (typeof (window as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
    (window as unknown as { PointerEvent: unknown }).PointerEvent = class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    };
  }
});

vi.mock('../api/notification-api', () => ({
  notificationApi: {
    getPreferences: vi.fn().mockResolvedValue([
      {
        id: 'p1',
        userId: 'u1',
        projectId: null,
        eventType: 'task.assigned',
        channels: ['in-app'],
        enabled: false,
      },
    ]),
    updatePreferences: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderDialog() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <NotificationSettingsDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('NotificationSettingsDialog', () => {
  it('渲染六类收件箱开关 + 系统通知段（图2 结构）', async () => {
    renderDialog();

    for (const title of ['分配', '状态变更', '评论', '提及', '优先级与截止日期', '智能体活动', '显示系统通知']) {
      expect(await screen.findByText(title)).toBeTruthy();
    }
  });

  it('已落库偏好驱动开关初始态；切换即单行落库', async () => {
    renderDialog();

    const switchState = (eventType: string) => {
      const row = document.querySelector(`[data-event-type="${eventType}"]`);
      expect(row).toBeTruthy();
      const sw = row!.querySelector('[role="switch"]');
      expect(sw).toBeTruthy();
      return sw!.hasAttribute('data-checked');
    };

    // task.assigned 显式关闭 → 开关初始 unchecked；未配置的类型默认开启
    await waitFor(() => expect(switchState('task.assigned')).toBe(false));
    expect(switchState('task.statusChanged')).toBe(true);

    // 打开「分配」→ PUT 单行 enabled=true
    fireEvent.click(screen.getByRole('switch', { name: '分配' }));
    await waitFor(() =>
      expect(notificationApi.updatePreferences).toHaveBeenCalledWith({
        preferences: [
          { eventType: 'task.assigned', channels: ['in-app'], enabled: true },
        ],
      }),
    );
  });
});
