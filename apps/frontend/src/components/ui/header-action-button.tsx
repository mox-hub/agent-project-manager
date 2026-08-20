import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHeader / ToolbarRow 操作按钮：默认正圆形仅图标，hover / focus-visible 展开为胶囊
 * （左侧圆形图标区 + 右侧文本）。展开是真实宽度变化，同组兄弟按钮自然位移。
 * `pinned` 常显展开态（下拉按钮在菜单打开时、视图样式切换的常驻形态）；
 * `trailing` 在文本后追加节点（如 ChevronDown）。
 */
const headerActionButtonVariants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90",
  outline:
    "border border-border bg-background text-foreground hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/85",
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger:
    "bg-destructive text-white hover:bg-destructive/90",
} as const;

export interface HeaderActionButtonProps
  extends Omit<React.ComponentProps<"button">, "children"> {
  icon: LucideIcon;
  /** 展开时显示的文本，同时作为无障碍标签 */
  label: string;
  variant?: keyof typeof headerActionButtonVariants;
  /** 常显胶囊展开态（不收回圆形） */
  pinned?: boolean;
  /** 展开态文本后追加的节点（如下拉箭头） */
  trailing?: React.ReactNode;
}

const HeaderActionButton = React.forwardRef<HTMLButtonElement, HeaderActionButtonProps>(
  ({ icon: Icon, label, variant = "primary", pinned = false, trailing, className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        data-slot="header-action-button"
        data-pinned={pinned ? "true" : undefined}
        className={cn(
          "group/hab flex h-8 shrink-0 items-center overflow-hidden rounded-full p-0 text-xs font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--motion-ease-standard)] select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/45 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
          headerActionButtonVariants[variant],
          className,
        )}
        {...props}
      >
        <span className="flex size-8 shrink-0 items-center justify-center">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <span
          className={cn(
            "flex max-w-0 items-center overflow-hidden text-xs font-medium opacity-0 whitespace-nowrap transition-all [transition-duration:var(--motion-normal)] [transition-timing-function:var(--motion-ease-standard)] group-hover/hab:max-w-48 group-hover/hab:py-0 group-hover/hab:pl-1 group-hover/hab:pr-3 group-hover/hab:opacity-100 group-focus-visible/hab:max-w-48 group-focus-visible/hab:py-0 group-focus-visible/hab:pl-1 group-focus-visible/hab:pr-3 group-focus-visible/hab:opacity-100",
            pinned && "max-w-48 py-0 pl-1 pr-3 opacity-100",
          )}
        >
          {label}
          {trailing}
        </span>
      </button>
    );
  },
);

HeaderActionButton.displayName = "HeaderActionButton";

export { HeaderActionButton, headerActionButtonVariants };
