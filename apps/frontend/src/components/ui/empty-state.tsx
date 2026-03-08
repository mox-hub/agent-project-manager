import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-content-text-tertiary">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-content-text">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-content-text-secondary max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}

export { EmptyState }
