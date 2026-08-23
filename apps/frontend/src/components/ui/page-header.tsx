import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FavoriteToggle } from "@/shared/components/favorite-toggle";

export interface PageHeaderMetric {
  id?: string;
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}

/** 计数胶囊：对齐 integration 页 StatusBadge 的胶囊形态（浅色底 + 描边 + 状态点），尺寸更小 */
const METRIC_TONE_CLASS: Record<NonNullable<PageHeaderMetric["tone"]>, { pill: string; dot: string }> = {
  default: { pill: "border-border bg-muted/60 text-muted-foreground", dot: "bg-muted-foreground/70" },
  success: { pill: "border-accent-green/40 bg-accent-green-light text-accent-green", dot: "bg-accent-green" },
  warning: { pill: "border-accent-yellow/50 bg-accent-yellow-light text-accent-yellow", dot: "bg-accent-yellow" },
  danger: { pill: "border-accent-red/40 bg-accent-red-light text-accent-red", dot: "bg-accent-red" },
};

interface PageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  /** 最右侧计数器标签（文本 + 数字），如任务数量、项目健康度 */
  metrics?: PageHeaderMetric[];
  /** 收藏标识，默认取当前路由 path */
  favoriteId?: string;
  className?: string;
  aiId?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

/** 从 ReactNode 提取纯文本，作为收藏到侧边栏时的页面名称 */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return nodeToText(props.children);
  }
  return "";
}

export function PageHeader({
  title,
  actions,
  metrics,
  favoriteId,
  className,
  aiId,
  icon: Icon,
  iconColor = "text-primary",
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex w-full shrink-0 items-center gap-2 border-b border-border bg-background px-6 py-2 md:px-7",
        className,
      )}
      data-ai-component={aiId ? `${aiId}.header` : "ui.page-header"}
      data-ai-role="content"
    >
      {Icon ? <Icon className={cn("size-5 shrink-0", iconColor)} strokeWidth={1.75} /> : null}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h1 className="m-0 min-w-0 truncate text-lg font-semibold leading-tight text-foreground">{title}</h1>
        <FavoriteToggle favoriteId={favoriteId} label={nodeToText(title).trim()} aiId={aiId} />
        {metrics && metrics.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            {metrics.map((metric, index) => {
              const tone = METRIC_TONE_CLASS[metric.tone ?? "default"];
              return (
                <span
                  key={metric.id ?? index}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                    tone.pill,
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
                  <span>{metric.label}</span>
                  <span className="font-semibold tabular-nums">{metric.value}</span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
