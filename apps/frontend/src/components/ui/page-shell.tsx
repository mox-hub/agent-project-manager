import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, type PageHeaderMetric } from "./page-header";

export type PageShellVariant = 'full' | 'standard' | 'reading';

const VARIANT_CONTAINER_CLASSES: Record<PageShellVariant, string> = {
  full: 'w-full',
  standard: 'w-full max-w-5xl mx-auto',
  reading: 'w-full max-w-4xl mx-auto',
};

const VARIANT_PADDING_CLASSES: Record<PageShellVariant, string> = {
  full: 'px-4 sm:px-6 py-4',
  standard: 'px-4 sm:px-6 py-6 sm:py-8',
  reading: 'px-6 sm:px-8 py-8 sm:py-10',
};

export interface PageShellProps {
  children: ReactNode;
  className?: string;
  /**
   * 页面规格变体（DESIGN.md §3.4 规范）：
   * - 'full' (默认): 全宽高密，视口 100% 展开，适合看板、工单列表、甘特图、多 Agent 协作大厅
   * - 'standard': 舒适限制（max-w-5xl ~1024px 居中），适合设置页、表单配置、管理面板、个人中心
   * - 'reading': 阅读聚焦（max-w-4xl ~896px 黄金阅读宽），适合文档详情阅读、帮助中心、日志审阅
   */
  variant?: PageShellVariant;
  /**
   * 是否自动对内容区注入标准页面内边距：
   * - standard: 默认为 true (px-4 sm:px-6 py-6 sm:py-8)
   * - reading: 默认为 true (px-6 sm:px-8 py-8 sm:py-10)
   * - full: 默认为 false（保持全宽自管画布兼容性；若需要标准全宽内边距可设为 true）
   */
  padded?: boolean;
  /** 内容包裹区额外类名 */
  contentClassName?: string;
  aiPage?: string;
  title?: ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: ReactNode;
  metrics?: PageHeaderMetric[];
  favoriteId?: string;
}

export function PageShell({
  children,
  className,
  variant = 'full',
  padded,
  contentClassName,
  aiPage,
  title,
  icon,
  iconColor,
  actions,
  metrics,
  favoriteId,
}: PageShellProps) {
  const hasHeader = Boolean(title || icon || actions || metrics);
  const shouldPad = padded ?? (variant !== 'full');

  return (
    <div
      className={cn("flex flex-1 min-h-0 flex-col bg-content-bg text-content-text", className)}
      data-ai-page={aiPage}
      data-ai-component={aiPage ? `${aiPage}.shell` : "ui.page-shell"}
      data-ai-role="page"
    >
      {hasHeader && (
        <PageHeader
          title={title ?? ""}
          icon={icon}
          iconColor={iconColor}
          actions={actions}
          metrics={metrics}
          favoriteId={favoriteId}
          aiId={aiPage}
          className="border-content-border"
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "flex flex-col flex-1",
            VARIANT_CONTAINER_CLASSES[variant],
            shouldPad && VARIANT_PADDING_CLASSES[variant],
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export interface PageBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: PageShellVariant;
  padded?: boolean;
}

/** 供页面内部局部区域按规格包裹的轻量容器 */
export function PageBody({
  children,
  variant = 'full',
  padded = true,
  className,
  ...props
}: PageBodyProps) {
  return (
    <div
      className={cn(
        "flex flex-col flex-1",
        VARIANT_CONTAINER_CLASSES[variant],
        padded && VARIANT_PADDING_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
