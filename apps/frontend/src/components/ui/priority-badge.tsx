import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const priorityBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      priority: {
        low: "bg-content-bg-secondary text-content-text-secondary",
        medium: "bg-accent-yellow-light text-accent-yellow",
        high: "bg-accent-red-light text-accent-red",
        critical: "bg-accent-red-light text-accent-red",
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
