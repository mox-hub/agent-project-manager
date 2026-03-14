import { useState } from 'react';
import { useNotifications, useMarkNotificationsRead, useUnreadNotificationsCount } from '../hooks/use-notifications';
import { Button } from '@/components/ui/button';
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
      className="w-[400px] max-h-[600px] flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden"
    >
      <div
        className="p-4 border-b border-slate-800 flex items-center justify-between"
      >
        <div className="text-sm font-semibold text-gray-200">
          Notifications
          {unreadCount && unreadCount > 0 && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold"
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
            className="text-xs text-gray-400 hover:text-gray-200 h-auto py-1 px-2"
          >
            Mark all as read
          </Button>
        )}
      </div>

      <div
        className="flex border-b border-slate-800 gap-1 p-2"
      >
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-md border-none text-xs cursor-pointer transition-colors ${
            filter === 'unread' ? 'bg-slate-800 text-gray-200' : 'bg-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md border-none text-xs cursor-pointer transition-colors ${
            filter === 'all' ? 'bg-slate-800 text-gray-200' : 'bg-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          All
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2"
      >
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 text-xs">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-xs">
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
                    ? 'bg-slate-800 border border-slate-700'
                    : 'border border-transparent hover:bg-slate-800/50'
                }`}
              >
                <div
                  className="flex items-start gap-2"
                >
                  {notification.status === 'unread' && (
                    <div
                      className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm ${
                        notification.status === 'unread' ? 'font-semibold' : 'font-normal'
                      } text-gray-200 mb-1`}
                    >
                      {notification.title}
                    </div>
                    {notification.body && (
                      <div
                        className="text-xs text-gray-400 mb-1"
                      >
                        {notification.body}
                      </div>
                    )}
                    <div
                      className="text-xs text-gray-500"
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
