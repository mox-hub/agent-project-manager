import { useState } from 'react';
import { useNotifications, useMarkNotificationsRead, useUnreadNotificationsCount } from '../hooks/use-notifications';
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
      style={{
        width: '400px',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#020617',
        border: '1px solid #111827',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>
          Notifications
          {unreadCount && unreadCount > 0 && (
            <span
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                borderRadius: '999px',
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadNotifications.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #1f2937',
              backgroundColor: '#111827',
              color: '#9ca3af',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #111827',
          gap: '4px',
          padding: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setFilter('unread')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: filter === 'unread' ? '#111827' : 'transparent',
            color: filter === 'unread' ? '#e5e7eb' : '#9ca3af',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: filter === 'all' ? '#111827' : 'transparent',
            color: filter === 'all' ? '#e5e7eb' : '#9ca3af',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          All
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
            No notifications
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleMarkAsRead(notification)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: notification.status === 'unread' ? '#111827' : 'transparent',
                  border: notification.status === 'unread' ? '1px solid #1f2937' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#111827';
                }}
                onMouseLeave={(e) => {
                  if (notification.status === 'read') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  {notification.status === 'unread' && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: notification.status === 'unread' ? 600 : 400,
                        color: '#e5e7eb',
                        marginBottom: '4px',
                      }}
                    >
                      {notification.title}
                    </div>
                    {notification.body && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                          marginBottom: '4px',
                        }}
                      >
                        {notification.body}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#6b7280',
                      }}
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
