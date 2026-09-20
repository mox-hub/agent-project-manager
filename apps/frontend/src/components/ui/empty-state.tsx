import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** 可选图标：置于 muted 圆块内（design-system「Empty States」规范形态） */
  icon?: ComponentType<{ className?: string }>;
  /** 可选自定义视觉块：整体替换图标圆块（如 IconStack 等距插画），用于整页大空态/引导时刻 */
  visual?: ReactNode;
  /**
   * 应用场景变体：
   * - page：整页主体空态——h-full 撑满父内容区 + min-h-100 兜底，垂直居中（配 visual 插画）。
   *   挂载要求：必须直挂页面的 `flex-1 overflow-auto` 素块容器；中间套 flex-col 包装、
   *   或经 DataList/自动高度容器隔断都会使 h-full 解析失败回落 min-h-100（半屏）
   * - card：分区内/筛选无结果的紧凑形态（默认，min-h-40）
   */
  variant?: "page" | "card";
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  visual,
  variant = "card",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center",
        variant === "page" ? "h-full min-h-100" : "min-h-40",
        className
      )}
    >
      {visual ? (
        <div className="mb-3 flex justify-center">{visual}</div>
      ) : Icon ? (
        <span className="mb-3 flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
