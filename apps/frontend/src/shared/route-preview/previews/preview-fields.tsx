/**
 * preview-fields.tsx - 预览卡片共用小件
 *
 * 各类型富卡片 body 复用的行 / 骨架 / 错误态 / 状态徽章 / 日期格式化。
 * 样式约束：只用语义色与 Tailwind 刻度（禁任意值）。
 */

import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

/** 单行「标签 + 值」，值超长截断 */
export function PreviewRow({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center justify-between gap-2', className)}>
      <span className="shrink-0 text-11 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-xs font-medium text-foreground">{children}</span>
    </div>
  );
}

/** body 数据加载中的骨架占位 */
export function PreviewBodySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === rows - 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  );
}

/** body 数据加载失败的静默降级（不打断卡片，头部标题仍可见） */
export function PreviewBodyError() {
  const { t } = useTranslation();
  return <p className="text-11 text-muted-foreground">{t('routePreview.loadError')}</p>;
}

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  // 项目 / 通用
  active: 'default',
  archived: 'outline',
  paused: 'outline',
  // 健康度
  on_track: 'default',
  at_risk: 'secondary',
  off_track: 'destructive',
  // 文档
  draft: 'outline',
  reviewing: 'secondary',
  published: 'default',
  rejected: 'destructive',
  // 验收
  pending: 'secondary',
  in_review: 'secondary',
  passed: 'default',
  failed: 'destructive',
  waived: 'outline',
  // 优先级 / 严重程度
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
  urgent: 'destructive',
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

/** 状态值 → 语义色徽章；label 走 routePreview.<namespace>.<value> i18n，未知值回退 humanize */
export function StatusPreviewBadge({
  status,
  namespace = 'status',
}: {
  status?: string | null;
  /** i18n 二级命名空间（status / category） */
  namespace?: string;
}) {
  const { t } = useTranslation();
  if (!status) return null;
  const variant = STATUS_BADGE_VARIANT[status] ?? 'secondary';
  return (
    <Badge variant={variant}>
      {t(`routePreview.${namespace}.${status}`, { defaultValue: humanize(status) })}
    </Badge>
  );
}

/** ISO 时间 → yyyy-MM-dd；空值显示占位符 */
export function formatPreviewDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'yyyy-MM-dd');
}

/** ISO 时间 → yyyy-MM-dd HH:mm（更新时间等时间点字段） */
export function formatPreviewDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'yyyy-MM-dd HH:mm');
}
