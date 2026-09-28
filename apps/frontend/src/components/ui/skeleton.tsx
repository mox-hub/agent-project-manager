import { cn } from "@/lib/utils"

/* ============================================
   Base Skeleton
   ============================================ */

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/* ============================================
   Skeleton Text — 单行或多行文本骨架
   ============================================ */

interface SkeletonTextProps {
  lines?: number
  className?: string
  lastLineWidth?: string
}

function SkeletonText({ lines = 3, className, lastLineWidth = "w-3/4" }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 ? lastLineWidth : "w-full"}
          style={{ height: "0.875rem" }}
        />
      ))}
    </div>
  )
}

/* ============================================
   Skeleton Card — 卡片形骨架
   ============================================ */

interface SkeletonCardProps {
  avatar?: boolean
  title?: boolean
  description?: boolean
  lines?: number
  className?: string
}

function SkeletonCard({
  avatar,
  title = true,
  description = true,
  lines = 2,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {avatar && (
          <Skeleton className="size-10 rounded-full shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          {title && (
            <Skeleton
              className="h-4 w-1/3"
            />
          )}
          {description && (
            <Skeleton className="h-3 w-1/2" />
          )}
        </div>
      </div>
      <div className="space-y-1.5 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-3",
              i === lines - 1 ? "w-2/3" : "w-full"
            )}
          />
        ))}
      </div>
    </div>
  )
}

/* ============================================
   Skeleton Avatar — 圆形头像骨架
   ============================================ */

interface SkeletonAvatarProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const avatarSizeMap = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
}

function SkeletonAvatar({ size = "md", className }: SkeletonAvatarProps) {
  return (
    <Skeleton
      className={cn(avatarSizeMap[size], "rounded-full shrink-0", className)}
    />
  )
}

/* ============================================
   Skeleton List — 列表骨架
   ============================================ */

interface SkeletonListProps {
  count?: number
  avatar?: boolean
  lines?: number
  className?: string
}

function SkeletonList({
  count = 5,
  avatar = false,
  lines = 2,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {avatar && <SkeletonAvatar />}
          <div className="flex-1">
            <SkeletonCard avatar={false} title lines={lines} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================================
   Skeleton Table — 表格骨架
   ============================================ */

interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-3 px-1">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center p-3 rounded-lg border border-border">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ============================================
   Skeleton Chart — 图表骨架
   ============================================ */

interface SkeletonChartProps {
  className?: string
}

function SkeletonChart({ className }: SkeletonChartProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end gap-2 h-32">
        {[65, 80, 45, 90, 60, 75, 55].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex gap-2 justify-around">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-4" />
        ))}
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonList,
  SkeletonTable,
  SkeletonChart,
}
