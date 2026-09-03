import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface AsyncStateProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
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
  emptyTitle = "暂无数据",
  emptyDescription,
  children,
}: AsyncStateProps) {
  if (isLoading) {
    return (
      loadingFallback ?? (
        <div className="flex min-h-45 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      )
    );
  }

  if (error) {
    return (
      <EmptyState
        title="加载失败"
        description={error}
        action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined}
      />
    );
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children}</>;
}
