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
          <span className="absolute left-3 flex items-center justify-center text-muted-foreground z-10 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <select
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-10 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "[background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] [background-repeat:no-repeat] [background-position:right_0.75rem_center] [background-size:16px]",
            leftIcon && "pl-10",
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
