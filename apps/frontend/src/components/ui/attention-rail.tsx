import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  X,
  TrendingDown,
  ArrowRight,
  GitBranch,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const NOTIFICATION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  task_assigned: { icon: CheckCircle2, color: "text-blue-500" },
  task_overdue: { icon: Clock, color: "text-red-500" },
  pr_review: { icon: GitBranch, color: "text-purple-500" },
  ai_complete: { icon: Sparkles, color: "text-violet-500" },
  mention: { icon: Bell, color: "text-amber-500" },
  system: { icon: AlertTriangle, color: "text-orange-500" },
};

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  projectId?: string;
  createdAt: string;
  read: boolean;
}

interface OverdueTask {
  id: string;
  identifier: string;
  title: string;
  projectId: string;
  dueDate?: string;
}

interface AtRiskProject {
  id: string;
  name: string;
  healthStatus: "on_track" | "at_risk" | "off_track";
  healthScore: number;
}

interface AttentionRailProps {
  projectId?: string;
  notifications?: Notification[];
  overdueTasks?: OverdueTask[];
  atRiskProjects?: AtRiskProject[];
  className?: string;
  aiPrefix?: string;
}

export function AttentionRail({
  projectId,
  notifications = [],
  overdueTasks = [],
  atRiskProjects = [],
  className,
}: AttentionRailProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const recentNotifications = notifications
    .filter((n) => !n.read && !dismissed.has(n.id))
    .filter((n) => !projectId || n.projectId === projectId)
    .slice(0, 4);

  const recentOverdue = overdueTasks.slice(0, 2);
  const recentAtRisk = atRiskProjects.filter((p) => p.healthStatus !== "on_track").slice(0, 3);

  const getTimeSince = useCallback((date: string) => {
    const now = new Date().getTime();
    const diff = now - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, []);

  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 flex-col border-l border-border bg-background md:flex",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-semibold text-foreground">Attention</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/app/notifications")}
        >
          View all
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* Unread Notifications */}
          {recentNotifications.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Bell className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Unread ({recentNotifications.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {recentNotifications.map((notif) => {
                  const cfg = NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.system;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      className="group relative cursor-pointer rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-accent/30"
                      onClick={() => navigate("/app/notifications")}
                    >
                      <button
                        className="absolute right-1.5 top-1.5 text-muted-foreground opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissed((prev) => new Set([...prev, notif.id]));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="flex items-start gap-2 pr-4">
                        <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", cfg.color)} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium leading-snug text-foreground">
                            {notif.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                            {notif.body}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground/60">
                            {getTimeSince(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {!projectId && recentOverdue.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-red-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Overdue
                </span>
              </div>
              <div className="space-y-1.5">
                {recentOverdue.map((task) => (
                  <div
                    key={task.id}
                    className="cursor-pointer rounded-lg border border-red-200 bg-red-50/50 p-2.5 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                    onClick={() => navigate(`/app/projects/${task.projectId}/board`)}
                  >
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-red-600">{task.identifier}</span>
                      <span className="text-[10px] font-medium text-red-500">overdue</span>
                    </div>
                    <p className="line-clamp-1 text-[11px] text-foreground">{task.title}</p>
                    {task.dueDate && (
                      <p className="mt-0.5 text-[10px] text-red-500">
                        Due{" "}
                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* At-Risk Projects */}
          {!projectId && recentAtRisk.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  At Risk
                </span>
              </div>
              <div className="space-y-1.5">
                {recentAtRisk.map((project) => (
                  <div
                    key={project.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent/30"
                    onClick={() => navigate(`/app/projects/${project.id}`)}
                  >
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        project.healthStatus === "at_risk" ? "bg-amber-500" : "bg-red-500",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-foreground">{project.name}</p>
                      <p className="text-[10px] text-muted-foreground">Score: {project.healthScore}</p>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Activity */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-violet-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                AI Activity
              </span>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-2.5 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="mb-1.5 flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
                <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
                  AI Agent monitoring
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Waiting for tasks...</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5 h-6 p-0 text-[10px] text-violet-600 hover:text-violet-700"
                onClick={() => navigate("/app/settings/ai")}
              >
                View in AI Hub <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Quick Jump */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Jump
              </span>
            </div>
            <div className="space-y-0.5">
              {[
                { label: "AI Hub", path: "/app/settings/ai", icon: Sparkles },
                { label: "Notifications", path: "/app/notifications", icon: Bell },
                { label: "Repositories", path: "/app/repositories", icon: GitBranch },
                { label: "Analytics", path: "/app/analytics", icon: Activity },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                  <ChevronRight className="ml-auto h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
