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
import { EmptyState } from "@/components/ui/empty-state";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  /** 双栏详情：当前选中条目（通知或会话）；列表数据刷新后找不到即回落空态 */
  const selectedNotification = useMemo(
    () => notifications.find((item) => item.id === selectedId) ?? null,
    [notifications, selectedId],
  );
  const selectedConversation = useMemo(
    () =>
      filter === "assistant"
        ? (conversations ?? []).find((item) => item.id === selectedId) ?? null
        : null,
    [conversations, selectedId, filter],
  );

  const getTimeSince = (date: string) => {
    const diff = NOTIFICATION_RENDER_TIME - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  /** 选中即视为已读（幂等：已读项跳过 mutation） */
  const handleSelect = (notification: Notification) => {
    setSelectedId(notification.id);
    if (notification.status === "read") return;
    markRead.mutate([notification.id], {
      onError: () => {
        toast.error("标记已读失败，请重试");
      },
    });
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
  };

  // 通知设置：个人级收件箱/系统通知开关，附属在通知模块
  const [settingsOpen, setSettingsOpen] = useState(false);

  const listLoading = filter === "assistant" ? conversationsLoading : isLoading;
  const listEmpty =
    filter === "assistant"
      ? (conversations ?? []).length === 0
      : notifications.length === 0;

  const detailEmptyTitle =
    filter === "assistant"
      ? t("notification.detail.emptyConversation")
      : t("notification.detail.emptyNotification");

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.notificationCenter}>
      <div className="flex h-full min-h-0">
        {/* ── 左栏：快捷操作 + 通知/会话列表 ── */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
                <FavoriteToggle label="Notifications" />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label="通知设置"
                  title="通知设置"
                  data-ai-component="notification.settings-button"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 size={14} className="text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : t("notification.allCaughtUp")}
              </span>
              {unreadNotifications.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => markRead.mutate(unreadNotifications.map((item) => item.id))}
                >
                  <Check size={14} />
                  Mark all read
                </Button>
              ) : null}
            </div>
          </div>
          <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

          <div className="flex items-center gap-1 border-b border-border px-3 py-2">
            {(["unread", "all", "assistant"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setFilter(tab);
                  setSelectedId(null);
                }}
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

          <div className="min-h-0 flex-1 overflow-auto">
            {listLoading ? (
              <div className="flex flex-col gap-2 p-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : error ? (
              <div className="p-3">
                <AsyncState error={error instanceof Error ? error.message : String(error)} onRetry={() => refetch()}>{null}</AsyncState>
              </div>
            ) : listEmpty ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                {filter === "assistant" ? (
                  <Bot className="mb-3 h-10 w-10 text-muted-foreground/60" />
                ) : (
                  <Bell className="mb-3 h-10 w-10 text-muted-foreground/60" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {filter === "assistant"
                    ? t("notification.assistant.empty")
                    : "You're all caught up!"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {filter === "assistant"
                    ? t("notification.assistant.hint")
                    : "No notifications yet"}
                </p>
              </div>
            ) : filter === "assistant" ? (
              <div>
                {(conversations ?? []).map((conversation) => {
                  const selected = conversation.id === selectedId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent",
                        selected && "bg-accent text-accent-foreground",
                      )}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-purple-light">
                        <Bot className="size-3.5 text-accent-purple" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm", selected ? "text-accent-foreground" : "text-foreground")}>
                          {conversation.title || t("assistant.history.untitled")}
                        </p>
                        <p className={cn("mt-0.5 text-xs", selected ? "text-accent-foreground/70" : "text-muted-foreground")}>
                          {t("notification.assistant.messageCount", { n: conversation.messageCount })}
                          {" · "}
                          {getTimeSince(conversation.updatedAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                {notifications.map((item) => {
                  const config = typeConfigFor(item.type);
                  const Icon = config.icon;
                  const selected = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent",
                        selected && "bg-accent text-accent-foreground",
                        item.status === "unread" && !selected && "bg-accent/20",
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", config.bg)}>
                        <Icon className={cn("size-3.5", config.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {item.status === "unread" ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                          <p className={cn("truncate text-sm", item.status === "unread" ? "font-medium text-foreground" : "text-muted-foreground", selected && "text-accent-foreground")}>
                            {item.title}
                          </p>
                        </div>
                        <p className={cn("mt-0.5 truncate text-xs", selected ? "text-accent-foreground/70" : "text-muted-foreground")}>
                          {item.body || getTimeSince(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── 右栏：选中项详情 ── */}
        <section className="flex min-w-0 flex-1 flex-col">
          {filter === "assistant" ? (
            selectedConversation ? (
              <div className="mx-auto w-full max-w-2xl px-6 py-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-purple-light">
                    <Bot className="size-5 text-accent-purple" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-foreground">
                      {selectedConversation.title || t("assistant.history.untitled")}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("notification.assistant.messageCount", { n: selectedConversation.messageCount })}
                      {" · "}
                      {getTimeSince(selectedConversation.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button
                    className="gap-1.5"
                    onClick={() => openAssistantConversation(selectedConversation.id)}
                  >
                    <MessageSquare className="size-4" />
                    {t("notification.assistant.continueChat")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                  title={detailEmptyTitle}
                  description={t("notification.detail.emptyHint")}
                />
              </div>
            )
          ) : selectedNotification ? (
            <div className="mx-auto w-full max-w-2xl px-6 py-6">
              {(() => {
                const config = typeConfigFor(selectedNotification.type);
                const Icon = config.icon;
                return (
                  <div className="flex items-start gap-3">
                    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", config.bg)}>
                      <Icon className={cn("size-5", config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-foreground">
                        {selectedNotification.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getTimeSince(selectedNotification.createdAt)}
                        {" · "}
                        {selectedNotification.status === "unread"
                          ? t("notification.detail.unread")
                          : t("notification.detail.read")}
                      </p>
                    </div>
                  </div>
                );
              })()}
              {selectedNotification.body ? (
                <p className="mt-4 text-base leading-relaxed text-content-text-secondary">
                  {selectedNotification.body}
                </p>
              ) : null}
              <div className="mt-6 flex items-center gap-2">
                <Button
                  variant={selectedNotification.status === "unread" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleSelect(selectedNotification)}
                  disabled={selectedNotification.status === "read"}
                >
                  <Check size={14} />
                  Mark as read
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title={detailEmptyTitle}
                description={t("notification.detail.emptyHint")}
              />
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
