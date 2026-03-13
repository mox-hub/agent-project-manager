import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const priorityBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      priority: {
        low: "bg-muted text-muted-foreground",
        medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
        critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      },
    },
    defaultVariants: {
      priority: "medium",
    },
  }
)

export type TaskPriority = "low" | "medium" | "high" | "critical"

export interface PriorityBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof priorityBadgeVariants> {
  priority?: TaskPriority
  label?: string
}

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

function PriorityBadge({ className, priority = "medium", label, ...props }: PriorityBadgeProps) {
  return (
    <span
      className={cn(priorityBadgeVariants({ priority: priority }), className)}
      {...props}
    >
      {label || priorityLabels[priority]}
    </span>
  )
}

export { PriorityBadge, priorityBadgeVariants }
