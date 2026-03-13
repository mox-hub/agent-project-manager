import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        todo: "bg-muted text-muted-foreground",
        in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
        in_review: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
        done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      },
    },
    defaultVariants: {
      status: "todo",
    },
  }
)

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done"

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: TaskStatus
  label?: string
}

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
}

function StatusBadge({ className, status = "todo", label, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status: status }), className)}
      {...props}
    >
      {label || statusLabels[status]}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
