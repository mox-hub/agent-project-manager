import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** 卡片标题旁彩色图标（设计标准：带标题卡片配 15/16px accent 图标） */
  icon?: LucideIcon;
  iconColor?: string;
  /** 覆盖 CardTitle 字号（默认 text-lg；设置页统一层级时传 text-base） */
  titleClassName?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  actions,
  icon: Icon,
  iconColor = "text-accent-blue",
  titleClassName,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("border-border bg-background", className)}>
      {title || description || actions ? (
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? (
              <CardTitle className={cn("flex items-center gap-2 text-foreground", titleClassName)}>
                {Icon ? <Icon className={cn("size-4 shrink-0", iconColor)} strokeWidth={1.75} /> : null}
                <span className="truncate">{title}</span>
              </CardTitle>
            ) : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
