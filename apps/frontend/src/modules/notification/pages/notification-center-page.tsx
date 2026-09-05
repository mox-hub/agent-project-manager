import { useMemo, useState, type ComponentType } from "react";
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import {
  AtSign,
  Bell,
  Bot,
  Check,
  CheckSquare,
  Clock,
  GitBranch,
  Info,
  MessageSquare,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from '@/components/ui/toast';
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { AsyncState } from "@/components/ui/async-state";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/infrastructure/store/app-store";
import { useAssistantConversationList } from "@/modules/assistant/hooks/use-assistant-session";
import type { Notification } from "../api/notification-api";
import { NotificationSettingsDialog } from "../components/notification-settings-dialog";
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "../hooks/use-notifications";

const NOTIFICATION_RENDER_TIME = Date.now();

/** 类型 → 图标/配色。key 为后端 dot 格式事件名（前缀族兜底，未知落 system） */
const TYPE_CONFIG: Record<
  string,
  { icon: ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  "task.assigned": { icon: CheckSquare, color: "text-accent-blue", bg: "bg-accent-blue-light" },
  "task.statusChanged": { icon: CheckSquare, color: "text-accent-blue", bg: "bg-accent-blue-light" },
  "task.created": { icon: CheckSquare, color: "text-accent-green", bg: "bg-accent-green-light" },
  "task.deleted": { icon: Clock, color: "text-accent-red", bg: "bg-accent-red-light" },
  "task.overdue": { icon: Clock, color: "text-accent-red", bg: "bg-accent-red-light" },
  "pr.review": { icon: GitBranch, color: "text-accent-yellow", bg: "bg-accent-yellow-light" },
  "document.created": { icon: GitBranch, color: "text-accent-blue", bg: "bg-accent-blue-light" },
  "document.deleted": { icon: GitBranch, color: "text-accent-red", bg: "bg-accent-red-light" },
  "project.created": { icon: GitBranch, color: "text-accent-green", bg: "bg-accent-green-light" },
  "project.archived": { icon: GitBranch, color: "text-accent-red", bg: "bg-accent-red-light" },
  "member.created": { icon: AtSign, color: "text-accent-green", bg: "bg-accent-green-light" },
  "member.removed": { icon: AtSign, color: "text-accent-red", bg: "bg-accent-red-light" },
  "team.created": { icon: AtSign, color: "text-accent-green", bg: "bg-accent-green-light" },
  "team.archived": { icon: AtSign, color: "text-accent-red", bg: "bg-accent-red-light" },
  "acceptance.created": { icon: Bot, color: "text-accent-purple", bg: "bg-accent-purple-light" },
  "acceptance.resolved": { icon: Bot, color: "text-accent-green", bg: "bg-accent-green-light" },
  "milestone.created": { icon: CheckSquare, color: "text-accent-purple", bg: "bg-accent-purple-light" },
  "tag.created": { icon: Info, color: "text-accent-blue", bg: "bg-accent-blue-light" },
  "tag.deleted": { icon: Info, color: "text-accent-red", bg: "bg-accent-red-light" },
  "ai.workflow.completed": { icon: Sparkles, color: "text-accent-purple", bg: "bg-accent-purple-light" },
  "ci.build.failed": { icon: Clock, color: "text-accent-red", bg: "bg-accent-red-light" },
  "ci.build.succeeded": { icon: Check, color: "text-accent-green", bg: "bg-accent-green-light" },
  mention: { icon: AtSign, color: "text-accent-green", bg: "bg-accent-green-light" },
  system: { icon: Info, color: "text-muted-foreground", bg: "bg-muted" },
};

/** dot 格式类型 → 图标配色；未知类型按事件族（task./document.…）兜底 */
function typeConfigFor(type: string) {
  if (TYPE_CONFIG[type]) return TYPE_CONFIG[type];
  const family = `${type.split(".")[0]}.`;
  const familyKey = Object.keys(TYPE_CONFIG).find((key) => key.startsWith(family));
  return (familyKey && TYPE_CONFIG[familyKey]) || TYPE_CONFIG.system;
}

export function NotificationCenterPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "unread" | "assistant">("unread");
  const openAssistantConversation = useAppStore(
    (s) => s.openAssistantConversation,
  );
  const { data, isLoading, error, refetch } = useNotifications({
    status: filter === "unread" ? "unread" : undefined,
    pageSize: 100,
  });
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationsRead();
  // 「AI 助理」tab：全部助手会话，点击唤起右下角浮窗继续对话
  const {
    data: conversations,
    isLoading: conversationsLoading,
  } = useAssistantConversationList(undefined);

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

  // 通知设置（图2）：个人级收件箱/系统通知开关，附属在通知模块
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              aria-label="通知设置"
              title="通知设置"
              data-ai-component="notification.settings-button"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={15} className="text-muted-foreground" />
            </Button>
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
        </div>
        <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

        <div className="flex items-center gap-2 border-b border-border px-6 py-2.5">
          {(["unread", "all", "assistant"] as const).map((tab) => (
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
              {tab === "unread"
                ? "Unread"
                : tab === "assistant"
                  ? t("notification.assistant.tab")
                  : "All"}
            </button>
          ))}
        </div>

        {filter === "assistant" ? (
          <div className="flex-1 overflow-auto">
            {conversationsLoading ? (
              <div className="flex flex-col gap-2 p-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (conversations ?? []).length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-24 text-center">
                <Bot className="mb-4 h-12 w-12 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">
                  {t("notification.assistant.empty")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("notification.assistant.hint")}
                </p>
              </div>
            ) : (
              <div>
                {(conversations ?? []).map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-border/60 px-6 py-4 text-left transition-colors hover:bg-accent/30"
                    onClick={() => openAssistantConversation(conversation.id)}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-purple-light">
                      <Bot className="h-4 w-4 text-accent-purple" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">
                            {conversation.title || t("assistant.history.untitled")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t("notification.assistant.messageCount", {
                              n: conversation.messageCount,
                            })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {getTimeSince(conversation.updatedAt)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-accent-purple">
                            <MessageSquare className="h-3 w-3" />
                            {t("notification.assistant.continueChat")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
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
                const config = typeConfigFor(item.type);
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
        )}
      </div>
    </PageShell>
  );
}
