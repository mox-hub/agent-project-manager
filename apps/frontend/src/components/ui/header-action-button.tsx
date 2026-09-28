import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { RawButton } from './raw-button'

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
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
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
  /**
   * 加载态：**由组件内部**在图标位渲染内联 `Spinner`（§10.6「按钮提交中 → 按钮
   * `disabled` + 内联 `Spinner`，禁遮罩」）。
   *
   * 为什么不让调用方自旋自己的 `icon`（2026-09-28 裁决）：`ui/spinner` 是加载指示的
   * 唯一实现（§10.6），而「给任意图标加 `animate-spin`」既绕开该唯一实现，也**绕开
   * `check-palette` 的 `Loader2` 字面量检查**（该规则只认 `Loader2` / `Loader2Icon` /
   * `Icons.Loader2` 三种写法）——即形成 lint 看不见的加载指示。故本档不再接受「转动
   * 调用方图标」这一形态，而是内部固定渲染 `Spinner`。
   *
   * 命名依 §10.7「加载 → `loading`」。
   * 与 `StatusIconFrame.spin` **不是同一轴**：后者是状态图标的「在制旋转」（状态语义，
   * 2026-09-28 裁决登记为合法形态），本档是加载指示，二者的合法依据与组件都不同。
   *
   * 约定：调用方须**同时**给 `disabled`（§10.6 的成对要求）。本组件不代为接管禁用态，
   * 以免与调用方自己的禁用条件打架。
   */
  loading?: boolean;
}

const HeaderActionButton = React.forwardRef<HTMLButtonElement, HeaderActionButtonProps>(
  ({ icon: Icon, label, variant = "primary", pinned = false, trailing, loading = false, className, type = "button", ...props }, ref) => {
    return (
      <RawButton
        ref={ref}
        type={type}
        aria-label={label}
        data-slot="header-action-button"
        data-pinned={pinned ? "true" : undefined}
        className={cn(
          "group/hab flex h-8 shrink-0 items-center overflow-hidden rounded-full p-0 text-xs font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--motion-ease-standard)] select-none outline-hidden focus-visible:ring-3 focus-visible:ring-ring/45 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
          headerActionButtonVariants[variant],
          className,
        )}
        {...props}
      >
        <span className="flex size-8 shrink-0 items-center justify-center">
          {loading ? (
            // size="sm" = size-4，与常态图标的 size-4 同框；
            // text-inherit 保色——Spinner 自带 text-muted-foreground，会压掉按钮自身的文字色。
            <Spinner size="sm" className="text-inherit" />
          ) : (
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          )}
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
      </RawButton>
    );
  },
);

HeaderActionButton.displayName = "HeaderActionButton";

export { HeaderActionButton, headerActionButtonVariants };
