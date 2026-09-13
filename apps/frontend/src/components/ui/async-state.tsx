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
        title={emptyTitle ?? t("common.noData", "暂无数据")}
        description={emptyDescription}
      />
    );
  }

  return <>{children}</>;
}
