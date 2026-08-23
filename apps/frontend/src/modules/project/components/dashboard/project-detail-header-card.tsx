import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ProjectDetailHeaderCardProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * 项目详情 tab 页头部卡片：标题 + 描述 + 操作按钮组。
 * 由 ProjectDetailFrame 内部渲染（hideHeader 可隐藏），页面亦可通过 Frame 的
 * title/description/actions props 传入内容。
 */
export function ProjectDetailHeaderCard({
  title,
  description,
  actions,
  className,
}: ProjectDetailHeaderCardProps) {
  return (
    <section
      className={cn(
        'mb-3 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold leading-none tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
