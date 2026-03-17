import { useState } from 'react';
import { useNotifications, useMarkNotificationsRead, useUnreadNotificationsCount } from '../hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Notification } from '../api/notification-api';

export function NotificationCenter() {
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const { data, isLoading } = useNotifications({
    status: filter === 'unread' ? 'unread' : undefined,
    pageSize: 50,
  });
  const { data: unreadCount } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationsRead();

  const notifications = data?.data || [];
  const unreadNotifications = notifications.filter((n) => n.status === 'unread');

  const handleMarkAsRead = (notification: Notification) => {
    if (notification.status === 'unread') {
      markRead.mutate([notification.id]);
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = unreadNotifications.map((n) => n.id);
    if (unreadIds.length > 0) {
      markRead.mutate(unreadIds);
    }
  };

  return (
    <div
      className="flex max-h-[680px] w-full flex-col overflow-hidden rounded-xl border border-content-border bg-content-bg"
      data-ai-component="notification.notification-center.panel"
      data-ai-role="content"
    >
      <div
        className="flex items-center justify-between border-b border-content-border p-4"
      >
        <div className="text-sm font-semibold text-content-text">
          Notifications
          {unreadCount && unreadCount > 0 && (
            <span
              className="ml-2 rounded-full bg-accent-red px-1.5 py-0.5 text-xs font-semibold text-white"
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadNotifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="h-auto px-2 py-1 text-xs text-content-text-secondary hover:text-content-text"
            data-ai-component="notification.notification-center.mark-all-read"
            data-ai-action="notification.notification-center.mark-all-read.click"
            data-ai-role="submit"
          >
            Mark all as read
          </Button>
        )}
      </div>

      <div
        className="border-b border-content-border p-2"
      >
        <SegmentedControl
          value={filter}
          onChange={(value) => setFilter(value as 'all' | 'unread')}
          options={[
            { value: 'unread', label: 'Unread' },
            { value: 'all', label: 'All' },
          ]}
          className="w-full"
        />
      </div>

      <div
        className="flex-1 overflow-y-auto p-2"
      >
        {isLoading ? (
          <div className="p-4 text-center text-xs text-content-text-tertiary">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-xs text-content-text-tertiary">
            No notifications
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleMarkAsRead(notification)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  notification.status === 'unread'
                    ? 'border border-content-border bg-content-bg-secondary'
                    : 'border border-transparent hover:bg-content-bg-secondary'
                }`}
                data-ai-component={`notification.notification-center.item.${notification.id}`}
                data-ai-action={`notification.notification-center.item.${notification.id}.open`}
                data-ai-role="jump"
              >
                <div
                  className="flex items-start gap-2"
                >
                  {notification.status === 'unread' && (
                    <div
                      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent-blue"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm ${
                        notification.status === 'unread' ? 'font-semibold' : 'font-normal'
                      } mb-1 text-content-text`}
                    >
                      {notification.title}
                    </div>
                    {notification.body && (
                      <div
                        className="mb-1 text-xs text-content-text-secondary"
                      >
                        {notification.body}
                      </div>
                    )}
                    <div
                      className="text-xs text-content-text-tertiary"
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
