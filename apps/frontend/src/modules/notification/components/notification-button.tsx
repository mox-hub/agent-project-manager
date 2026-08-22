import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useUnreadNotificationsCount } from "../hooks/use-notifications";
import { useEventSubscription } from "@/infrastructure/hooks/use-event-subscription";
import { NotificationCenter } from "./notification-center";

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount } = useUnreadNotificationsCount();
  const queryClient = useQueryClient();

  useEventSubscription("notification.created", () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  });

  useEventSubscription("notification.read", () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor>
        <Button
          onClick={() => setIsOpen((prev) => !prev)}
          variant="ghost"
          size="icon"
          className={cn("relative h-8 w-8 rounded-full", isOpen && "bg-muted/50")}
          title="Notifications"
          data-ai-component="notification.notification-button.trigger"
          data-ai-action="notification.notification-button.trigger.click"
          data-ai-role="jump"
        >
          <Bell size={16} className="text-muted-foreground" />
          {unreadCount && unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-10 font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverAnchor>
      <PopoverContent
        className="w-100 max-w-[92vw] p-0"
        data-ai-component="notification.notification-button.popover"
        data-ai-role="panel"
      >
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  );
}
