import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onClick?: () => void;
  accentClassName?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  iconBg,
  trend,
  trendValue,
  onClick,
  accentClassName,
  className,
}: StatCardProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/60 bg-card p-4 text-card-foreground shadow-xs",
        isClickable && "cursor-pointer transition-colors hover:bg-muted/50 hover:shadow-md",
        className,
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <h3
            className={cn(
              "text-2xl font-bold text-foreground",
              accentClassName,
            )}
          >
            {value}
          </h3>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md",
              iconBg || "bg-muted",
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {trend && trendValue ? (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-green-600 dark:text-green-400",
              trend === "down" && "text-red-600 dark:text-red-400",
              trend === "neutral" && "text-muted-foreground",
            )}
          >
            {trend === "up" ? "+" : trend === "down" ? "-" : ""}
            {trendValue}
          </span>
        </div>
      ) : null}
    </div>
  );
}
