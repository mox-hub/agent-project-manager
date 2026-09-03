import { useMemo, useState, type ComponentType } from "react";
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import {
  AtSign,
  Bell,
  Check,
  CheckSquare,
  Clock,
  GitBranch,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from '@/components/ui/toast';
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { AsyncState } from "@/components/ui/async-state";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { cn } from "@/lib/utils";
import type { Notification } from "../api/notification-api";
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "../hooks/use-notifications";

const NOTIFICATION_RENDER_TIME = Date.now();

const TYPE_CONFIG: Record<
  string,
  { icon: ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  task_assigned: { icon: CheckSquare, color: "text-accent-blue", bg: "bg-accent-blue-light" },
  task_overdue: { icon: Clock, color: "text-accent-red", bg: "bg-accent-red-light" },
  pr_review: { icon: GitBranch, color: "text-accent-yellow", bg: "bg-accent-yellow-light" },
  ai_complete: { icon: Sparkles, color: "text-accent-purple", bg: "bg-accent-purple-light" },
  mention: { icon: AtSign, color: "text-accent-green", bg: "bg-accent-green-light" },
  system: { icon: Info, color: "text-muted-foreground", bg: "bg-muted" },
};

export function NotificationCenterPage() {
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const { data, isLoading, error, refetch } = useNotifications({
    status: filter === "unread" ? "unread" : undefined,
    pageSize: 100,
  });
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationsRead();

  const notifications = useMemo(() => data?.items ?? [], [data?.items]);
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => item.status === "unread"),
    [notifications],
  );

  const getTimeSince = (date: string) => {
    const diff = NOTIFICATION_RENDER_TIME - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleMarkRead = (notification: Notification) => {
    if (notification.status === "read") return;
    markRead.mutate([notification.id], {
      onError: () => {
        toast.error("标记已读失败，请重试");
      },
    });
  };

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.notificationCenter}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-start gap-2">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
              {unreadCount > 0 ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{unreadCount} unread</p>
              ) : null}
            </div>
            <FavoriteToggle label="Notifications" />
          </div>
          {unreadNotifications.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => markRead.mutate(unreadNotifications.map((item) => item.id))}
            >
              <Check size={13} />
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 border-b border-border px-6 py-2.5">
          {(["unread", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === tab
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab === "unread" ? "Unread" : "All"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : error ? (
            <div className="p-4">
              <AsyncState error={error instanceof Error ? error.message : String(error)} onRetry={() => refetch()}>{null}</AsyncState>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-24 text-center">
              <Bell className="mb-4 h-12 w-12 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">You're all caught up!</p>
              <p className="mt-1 text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((item) => {
                const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
                const Icon = config.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-6 py-4 text-left transition-colors hover:bg-accent/30",
                      item.status === "unread" && "bg-accent/20",
                    )}
                    onClick={() => handleMarkRead(item)}
                  >
                    <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn("text-sm", item.status === "unread" ? "font-medium text-foreground" : "text-muted-foreground")}>
                            {item.title}
                          </p>
                          {item.body ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {item.body}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === "unread" ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                          <span className="whitespace-nowrap text-xs text-muted-foreground">{getTimeSince(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
