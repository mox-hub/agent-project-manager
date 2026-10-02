import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, type PageHeaderMetric } from "@/components/semantic/page-header";

export type PageShellVariant = 'full' | 'wide' | 'standard' | 'reading';

/** L1 主栏宽度四档总表（F1.3）——详情母版 DetailPageFrame 同表分发（§20.2），勿在别处手写 */
export const VARIANT_CONTAINER_CLASSES: Record<PageShellVariant, string> = {
  full: 'w-full',
  wide: 'w-full max-w-7xl mx-auto',
  standard: 'w-full max-w-5xl mx-auto',
  reading: 'w-full max-w-4xl mx-auto',
};

const VARIANT_PADDING_CLASSES: Record<PageShellVariant, string> = {
  full: 'px-4 sm:px-6 py-4',
  wide: 'px-4 sm:px-6 py-6 sm:py-8',
  standard: 'px-4 sm:px-6 py-6 sm:py-8',
  reading: 'px-6 sm:px-8 py-8 sm:py-10',
};

export interface PageShellProps {
  children: ReactNode;
  className?: string;
  /**
   * 页面规格变体（F 类 F1.3 主栏宽度四档总表；DESIGN.md §3.4 转正）：
   * - 'full' (默认): 全宽高密，视口 100% 展开，适合看板、工单列表、甘特图、多 Agent 协作大厅
   * - 'wide': 聚合宽档（max-w-7xl ~1280px 居中），适合聚合型详情主栏、仪表盘、多卡片网格
   * - 'standard': 舒适限制（max-w-5xl ~1024px 居中），适合设置页、表单配置、管理面板、个人中心
   * - 'reading': 阅读聚焦（max-w-4xl ~896px 黄金阅读宽），适合文档详情阅读、帮助中心、日志审阅
   *
   * 注：L2 详情母版（project-detail-frame 等）按 F1.2 结构自管双栏、不走本组件
   * 居中滚动——其主栏宽度自管 max-w-7xl（同 wide 档），属母版分发而非手写补位。
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
  /**
   * 标题右侧收藏/订阅槽位：由业务调用方构造节点（如 <FavoriteToggle /> / <SubscribeButton />），
   * 透传给内嵌 PageHeader，不传则不渲染（收藏标识未传时默认取当前路由 path）。
   */
  favorites?: ReactNode;
  subscribe?: ReactNode;
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
  favorites,
  subscribe,
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
          favorites={favorites}
          subscribe={subscribe}
          aiId={aiPage}
          className="border-content-border"
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            // min-h-0 与外层包装一致：flex 压缩链必须逐层贯通，否则内容高度
            // 反向撑破视口（自管页面溢出被裁、文档流页面撑高整页滚动）
            "flex min-h-0 flex-col flex-1",
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
