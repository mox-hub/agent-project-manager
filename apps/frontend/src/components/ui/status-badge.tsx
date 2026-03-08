import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        todo: "bg-content-bg-secondary text-content-text-secondary",
        in_progress: "bg-accent-blue-light text-accent-blue",
        in_review: "bg-accent-purple-light text-accent-purple",
        done: "bg-accent-green-light text-accent-green",
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
