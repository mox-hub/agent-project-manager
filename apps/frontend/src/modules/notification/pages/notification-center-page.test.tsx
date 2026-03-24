import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationCenterPage } from './notification-center-page';

vi.mock('../components/notification-center', () => ({
  NotificationCenter: ({
    filter,
    onFilterChange,
  }: {
    filter?: 'all' | 'unread';
    onFilterChange?: (value: 'all' | 'unread') => void;
  }) => (
    <div>
      <div data-testid="notification-filter">{filter}</div>
      <button type="button" onClick={() => onFilterChange?.('all')}>
        Set All
      </button>
    </div>
  ),
}));

describe('NotificationCenterPage', () => {
  it('syncs page filter state with notification center', async () => {
    render(
      <MemoryRouter>
        <NotificationCenterPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeTruthy();
    expect(screen.getByTestId('notification-filter').textContent).toBe('unread');

    fireEvent.click(screen.getByRole('button', { name: 'Set All' }));
    expect(screen.getByTestId('notification-filter').textContent).toBe('all');
  });
});
