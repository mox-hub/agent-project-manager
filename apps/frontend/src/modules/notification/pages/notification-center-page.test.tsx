import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenterPage } from './notification-center-page';

const useNotificationsMock = vi.fn();
const markMutateMock = vi.fn();

vi.mock('../hooks/use-notifications', () => ({
  useNotifications: (params?: unknown) => useNotificationsMock(params),
  useUnreadNotificationsCount: () => ({ data: 1 }),
  useMarkNotificationsRead: () => ({ mutate: markMutateMock }),
}));

describe('NotificationCenterPage', () => {
  beforeEach(() => {
    useNotificationsMock.mockReset();
    markMutateMock.mockReset();
    useNotificationsMock.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            id: 'n1',
            type: 'task_assigned',
            title: 'Task assigned',
            body: 'You have a new task',
            status: 'unread',
            createdAt: '2026-03-28T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    });
  });

  it('renders notifications and switches filter tab', async () => {
    render(
      <MemoryRouter>
        <NotificationCenterPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeTruthy();
    expect(screen.getByText('Task assigned')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(useNotificationsMock).toHaveBeenCalled();
  });

  it('marks single notification as read on click', async () => {
    render(
      <MemoryRouter>
        <NotificationCenterPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('Task assigned'));
    expect(markMutateMock).toHaveBeenCalledWith(['n1']);
  });
});
