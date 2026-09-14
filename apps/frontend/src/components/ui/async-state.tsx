import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface AsyncStateProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  emptyIcon?: ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  /** 空态场景变体透传：page=整页主体空态（撑满内容区），card=分区内紧凑形态（默认） */
  emptyVariant?: "page" | "card";
  /** 空态自定义视觉块透传（page 变体配 IconStack 插画）；错误态恒为 card 简式 */
  emptyVisual?: ReactNode;
  children: ReactNode;
}

export function AsyncState({
  isLoading,
  isEmpty,
  error,
  onRetry,
  loadingFallback,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyVariant = "card",
  emptyVisual,
  children,
}: AsyncStateProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      loadingFallback ?? (
        <div className="flex min-h-45 items-center justify-center text-sm text-muted-foreground">
          {t("common.loading", "Loading...")}
        </div>
      )
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t("common.loadFailed", "加载失败")}
        description={error}
        action={onRetry ? <Button onClick={onRetry}>{t("common.retry", "重试")}</Button> : undefined}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        visual={emptyVisual}
        variant={emptyVariant}
        title={emptyTitle ?? t("common.noData", "暂无数据")}
        description={emptyDescription}
      />
    );
  }

  return <>{children}</>;
}
