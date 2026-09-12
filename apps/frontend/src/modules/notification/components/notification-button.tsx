import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useUnreadNotificationsCount } from "../hooks/use-notifications";
import { useEventSubscription } from "@/infrastructure/hooks/use-event-subscription";
import { notificationApi } from "../api/notification-api";
import {
  invoke,
  isTauriAvailable,
  type DesktopActionResult,
} from "@/shared/types/electron-api";
import { NotificationCenter } from "./notification-center";

interface NotificationCreatedPayload {
  title?: string;
  body?: string | null;
}

/** 系统通知（system.desktop 偏好）：App 失焦时弹操作系统原生横幅 */
function showDesktopBanner(
  payload: NotificationCreatedPayload,
  prefs: { eventType: string; enabled: boolean }[] | undefined,
) {
  if (typeof document !== "undefined" && !document.hidden) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  // 未配置 = 默认开启；显式关闭才跳过
  const pref = prefs?.find((p) => p.eventType === "system.desktop");
  if (pref && !pref.enabled) return;
  try {
    new Notification(payload.title ?? "新通知", {
      body: payload.body ?? undefined,
    });
  } catch {
    // 横幅失败不影响主流程
  }
}

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount } = useUnreadNotificationsCount();
  const queryClient = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: () => notificationApi.getPreferences(),
    staleTime: 60 * 1000,
    select: (rows) => rows.map((r) => ({ eventType: r.eventType, enabled: r.enabled })),
  });

  useEventSubscription("notification.created", (payload) => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    const created = payload as NotificationCreatedPayload;
    // 桌面模式走壳侧原生通知（主进程 Notification，免网页授权）；web 回落浏览器横幅
    if (isTauriAvailable()) {
      void invoke<DesktopActionResult>("show_notification", {
        title: created.title ?? "Agent Project Manager",
        body: created.body ?? "",
      }).catch(() => undefined);
    } else {
      showDesktopBanner(created, prefs);
    }
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
