import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUnreadNotificationsCount } from '../hooks/use-notifications';
import { useEventSubscription } from '../../../infrastructure/hooks/use-event-subscription';
import { NotificationCenter } from './notification-center';

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadNotificationsCount();
  const queryClient = useQueryClient();

  // Subscribe to notification events for real-time updates
  useEventSubscription('notification.created', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  useEventSubscription('notification.read', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: '1px solid #1f2937',
          backgroundColor: '#020617',
          color: '#9ca3af',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        title="Notifications"
      >
        🔔
        {unreadCount && unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              border: '2px solid #020617',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '40px',
            right: 0,
            zIndex: 1000,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          <NotificationCenter />
        </div>
      )}
    </div>
  );
}
