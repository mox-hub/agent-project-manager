import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { useUnreadNotificationsCount } from '@/modules/notification/hooks/use-notifications';
import { useEventSubscription } from '@/infrastructure/hooks/use-event-subscription';
import { NotificationCenter } from '@/modules/notification/components/notification-center';

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount } = useUnreadNotificationsCount();
  const queryClient = useQueryClient();

  useEventSubscription('notification.created', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  useEventSubscription('notification.read', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8 rounded-full",
            isOpen && "bg-zinc-100 dark:bg-zinc-800"
          )}
          title="Notifications"
        >
          <Bell size={16} className="text-zinc-400" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverAnchor>
      <PopoverContent className="w-[380px] p-0">
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  );
}
