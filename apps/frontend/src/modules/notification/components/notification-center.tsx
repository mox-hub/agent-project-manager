import { useState } from 'react';
import { useNotifications, useMarkNotificationsRead, useUnreadNotificationsCount } from '../hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Notification } from '../api/notification-api';

type NotificationCenterProps = {
  filter?: 'all' | 'unread';
  onFilterChange?: (value: 'all' | 'unread') => void;
};

export function NotificationCenter({ filter, onFilterChange }: NotificationCenterProps = {}) {
  const [internalFilter, setInternalFilter] = useState<'all' | 'unread'>('unread');
  const activeFilter = filter ?? internalFilter;
  const { data, isLoading, isError, error, refetch } = useNotifications({
    status: activeFilter === 'unread' ? 'unread' : undefined,
    pageSize: 50,
  });
  const { data: unreadCount } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationsRead();
  const { t } = useTranslation();

  const notifications = data?.items || [];
  const unreadNotifications = notifications.filter((n) => n.status === 'unread');

  const handleMarkAsRead = (notification: Notification) => {
    if (notification.status === 'unread') {
      markRead.mutate([notification.id], {
        onError: () => toast.error(t("notification.messages.markReadFailed")),
      });
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = unreadNotifications.map((n) => n.id);
    if (unreadIds.length > 0) {
      markRead.mutate(unreadIds, {
        onError: () => toast.error(t("notification.messages.batchMarkReadFailed")),
      });
    }
  };

  return (
    <div
      className="flex max-h-[680px] w-full flex-col overflow-hidden rounded-xl border border-border bg-background"
      data-ai-component="notification.notification-center.panel"
      data-ai-role="content"
    >
      <div
        className="flex items-center justify-between border-b border-border p-4"
      >
        <div className="text-sm font-semibold text-foreground">
          {t("notification.title")}
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
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            data-ai-component="notification.notification-center.mark-all-read"
            data-ai-action="notification.notification-center.mark-all-read.click"
            data-ai-role="submit"
          >
            {t("notification.markAllRead")}
          </Button>
        )}
      </div>

      <div
        className="border-b border-border p-2"
      >
        <SegmentedControl
          value={activeFilter}
          onChange={(value) => {
            const next = value as 'all' | 'unread';
            if (onFilterChange) {
              onFilterChange(next);
              return;
            }
            setInternalFilter(next);
          }}
          options={[
            { value: 'unread', label: t("notification.status.unread") },
            { value: 'all', label: t("common.all") },
          ]}
          className="w-full"
        />
      </div>

      <ScrollArea className="flex-1 p-2">
        {isError ? (
          <div className="flex flex-col gap-2 p-4">
            <Alert variant="destructive" className="text-left">
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>{t("common.error")}</AlertTitle>
              <AlertDescription>
                {error?.message || t("notification.loadError")}
              </AlertDescription>
            </Alert>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {t("notification.noNotifications")}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleMarkAsRead(notification)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  notification.status === 'unread'
                    ? 'border border-border bg-muted/50'
                    : 'border border-transparent hover:bg-muted/50'
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
                      } mb-1 text-foreground`}
                    >
                      {notification.title}
                    </div>
                    {notification.body && (
                      <div
                        className="mb-1 text-xs text-muted-foreground"
                      >
                        {notification.body}
                      </div>
                    )}
                    <div
                      className="text-xs text-muted-foreground"
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
