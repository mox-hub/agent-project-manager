import * as React from "react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  leftIcon?: ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, leftIcon, ...props }, ref) => {
    return (
      <div className={cn("relative inline-flex w-full items-center")}>
        {leftIcon && (
          <span className="absolute left-3 flex items-center justify-center text-content-text-muted z-10 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <select
          className={cn(
            "flex h-9 w-full appearance-none rounded-md border border-content-border bg-content-bg py-1.5 pl-10 pr-10 text-sm shadow-sm transition-all focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20 disabled:cursor-not-allowed disabled:opacity-50",
            "[background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] [background-repeat:no-repeat] [background-position:right_8px_center]",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
